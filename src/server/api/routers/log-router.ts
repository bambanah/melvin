import { parseUtcTime } from "@/lib/date-utils";
import type { ActivityTransportType, PrismaClient } from "@/generated/client";
import { ownedDb } from "@/server/api/owned";
import { billableTravelDuration, defaultTravelDuration } from "@/lib/log-utils";
import {
	createActivityBatch,
	type ActivityDraft,
	type CreatedActivity
} from "@/server/api/activity-creation";
import {
	END_AFTER_START_MESSAGE,
	OPEN_SESSION_EDIT_MESSAGE,
	captureHandoverSchema,
	timeOfDaySchema,
	workSessionEditSchema,
	workSessionStartSchema
} from "@/schema/log-schema";
import { differenceInMinutes } from "date-fns";
import { authedProcedure, router } from "@/server/api/trpc";
import { TRPCError, inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

// A Session's participants have no natural order - the join table is keyed by
// (Session, Client) - so every read orders them by clientId. Promotion treats
// the first as the Session's primary participant (the Activity that carries
// the captured transport and joins the Trip), and that choice has to be the
// same on every read of the same Session.
const participantsOrdered = {
	select: { clientId: true, client: { select: { name: true } } },
	orderBy: { clientId: "asc" as const }
};

const workSessionSelect = {
	id: true,
	date: true,
	startTime: true,
	endTime: true,
	precededByWorkSessionId: true,
	handoverType: true,
	interClientDistance: true,
	interClientDuration: true,
	updatedAt: true,
	participants: participantsOrdered,
	transportItems: {
		select: { id: true, type: true, amount: true, note: true }
	}
};

type LogContext = {
	prisma: PrismaClient;
	owned: ReturnType<typeof ownedDb>;
	session: { user: { id: string } };
};

const participantsCreate = (clientIds: string[]) => ({
	create: clientIds.map((clientId) => ({ clientId }))
});

/**
 * Last-write-wins on `updatedAt`: a capture that was tapped before the version
 * already stored is a delayed offline replay, and applying it would undo a
 * newer edit of the same Session. Every stamped write checks this and hands
 * back the row as it actually stands instead of failing - the tap is simply
 * the older one.
 */
const isStale = (session: { updatedAt: Date }, tappedAt: Date | undefined) =>
	tappedAt !== undefined && session.updatedAt > tappedAt;

/** The Session as it currently stands - what a dropped stale write returns. */
async function readBack(ctx: LogContext, id: string) {
	const current = await ctx.owned.workSession.findFirst({
		where: { id },
		select: workSessionSelect
	});
	if (!current) throw new TRPCError({ code: "NOT_FOUND" });
	return current;
}

// One participant row = solo, N rows = group; the composition picks the
// default Support Item and gives the mirrored Activities their groupSize.
const isGroupSession = (session: { participants: unknown[] }) =>
	session.participants.length > 1;

// Shared by recordTrip (a DISTANCE item in km) and recordCost (flat Transport
// Expenses). Idempotent on the client-generated item id for offline replays.
async function createTransportItem(
	ctx: LogContext,
	item: {
		id?: string;
		workSessionId: string;
		type: ActivityTransportType;
		amount: number;
		note?: string;
	}
) {
	await ctx.owned.workSession.assert(item.workSessionId);

	if (item.id) {
		const existing = await ctx.prisma.workSessionTransportItem.findFirst({
			where: { id: item.id, workSession: { ownerId: ctx.session.user.id } },
			select: { id: true, type: true, amount: true, note: true }
		});
		// A replayed capture that already synced is a no-op, never a duplicate.
		if (existing) return existing;
	}

	return ctx.prisma.workSessionTransportItem.create({
		data: {
			id: item.id,
			workSessionId: item.workSessionId,
			type: item.type,
			amount: item.amount,
			note: item.note
		},
		select: { id: true, type: true, amount: true, note: true }
	});
}

const participantChangeSchema = z.object({
	workSessionId: z.string(),
	clientId: z.string(),
	at: timeOfDaySchema,
	// Client-generated id for the Session opened at the pivot, so an offline
	// replay of the same composition change never splits twice.
	newWorkSessionId: z.string().optional(),
	// Tap-time stamp for both touched rows - see captureHandoverSchema.
	updatedAt: z.date().optional()
});

// A composition change is an In-Place Handover: the current Session closes at
// the pivot instant and a new one opens at the same instant carrying the
// existing Client(s) plus/minus one - producing the correct per-composition
// split. No driving is recorded: nobody moved.
async function splitAtPivot(
	ctx: LogContext,
	input: z.infer<typeof participantChangeSchema>,
	changeComposition: (clientIds: string[]) => string[]
) {
	if (input.newWorkSessionId) {
		const replayed = await ctx.owned.workSession.findFirst({
			where: { id: input.newWorkSessionId },
			select: workSessionSelect
		});
		if (replayed) return replayed;
	}

	const session = await ctx.owned.workSession.findFirst({
		where: { id: input.workSessionId },
		select: {
			id: true,
			date: true,
			startTime: true,
			endTime: true,
			ownerId: true,
			updatedAt: true,
			participants: participantsOrdered
		}
	});
	if (!session) throw new TRPCError({ code: "NOT_FOUND" });

	if (isStale(session, input.updatedAt)) return readBack(ctx, session.id);

	if (session.endTime) {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"Participants can only change on an Open Session - edit the captured Sessions instead"
		});
	}

	const pivot = parseUtcTime(input.at);
	if (pivot <= session.startTime) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "The change must happen after the Session started"
		});
	}

	const clientIds = changeComposition(
		session.participants.map((p) => p.clientId)
	);

	return ctx.prisma.$transaction(async (tx) => {
		await tx.workSession.update({
			where: { id: session.id },
			data: { endTime: pivot, updatedAt: input.updatedAt }
		});

		return tx.workSession.create({
			data: {
				id: input.newWorkSessionId,
				ownerId: session.ownerId,
				date: session.date,
				startTime: pivot,
				precededByWorkSessionId: session.id,
				handoverType: "IN_PLACE",
				updatedAt: input.updatedAt,
				participants: participantsCreate(clientIds)
			},
			select: workSessionSelect
		});
	});
}

export const logRouter = router({
	start: authedProcedure
		.input(workSessionStartSchema)
		.mutation(async ({ ctx, input }) => {
			for (const clientId of input.clientIds) {
				await ctx.owned.client.assert(clientId);
			}

			// Offline replay: a start that already synced is a no-op, so a
			// delayed duplicate upload never re-runs the handover below.
			if (input.id) {
				const existing = await ctx.owned.workSession.findFirst({
					where: { id: input.id },
					select: workSessionSelect
				});
				if (existing) return existing;
			}

			const startTime = parseUtcTime(input.startTime);

			// At most one Open Session per Provider: starting the next Client
			// auto-closes the previous at the moment the new one begins.
			const open = await ctx.owned.workSession.findFirst({
				where: { endTime: null },
				select: { id: true, date: true, startTime: true }
			});

			if (open) {
				const sameDay = open.date.getTime() === input.date.getTime();
				if (!sameDay || open.startTime > startTime) {
					throw new TRPCError({
						code: "CONFLICT",
						message:
							"An Open Session can't be closed at this start time - end it with the right time first"
					});
				}
			}

			return ctx.prisma.$transaction(async (tx) => {
				if (open) {
					await tx.workSession.update({
						where: { id: open.id },
						// Stamped with the new Session's tap time so a later-queued
						// stamped write to the auto-closed Session isn't dropped as
						// stale by last-write-wins.
						data: { endTime: startTime, updatedAt: input.updatedAt }
					});
				}

				return tx.workSession.create({
					data: {
						id: input.id,
						ownerId: ctx.session.user.id,
						date: input.date,
						startTime,
						updatedAt: input.updatedAt,
						participants: participantsCreate(input.clientIds)
					},
					select: workSessionSelect
				});
			});
		}),

	end: authedProcedure
		.input(
			z.object({
				id: z.string(),
				endTime: timeOfDaySchema,
				updatedAt: z.date().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const session = await ctx.owned.workSession.findFirst({
				where: { id: input.id },
				select: { id: true, startTime: true, updatedAt: true }
			});
			if (!session) throw new TRPCError({ code: "NOT_FOUND" });

			if (isStale(session, input.updatedAt)) return readBack(ctx, input.id);

			const endTime = parseUtcTime(input.endTime);
			if (endTime <= session.startTime) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: END_AFTER_START_MESSAGE
				});
			}

			return ctx.prisma.workSession.update({
				where: { id: session.id },
				data: { endTime, updatedAt: input.updatedAt },
				select: workSessionSelect
			});
		}),

	edit: authedProcedure
		.input(workSessionEditSchema)
		.mutation(async ({ ctx, input }) => {
			for (const clientId of input.clientIds) {
				await ctx.owned.client.assert(clientId);
			}

			// Raw (unscoped) read by design: the upsert must distinguish "exists
			// but unowned" (NOT_FOUND) from "absent, safe to create with this
			// client-generated id" - ctx.owned can't express that.
			const existing = await ctx.prisma.workSession.findUnique({
				where: { id: input.id },
				select: { id: true, ownerId: true, updatedAt: true }
			});
			if (existing && existing.ownerId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			if (existing && isStale(existing, input.updatedAt)) {
				return readBack(ctx, input.id);
			}

			// At most one Open Session per Provider: an edit that leaves this
			// Session Open (or backfills a new Open one) must not create a second.
			if (!input.endTime) {
				const open = await ctx.owned.workSession.findFirst({
					where: { endTime: null, id: { not: input.id } },
					select: { id: true }
				});
				if (open) {
					throw new TRPCError({
						code: "CONFLICT",
						message: OPEN_SESSION_EDIT_MESSAGE
					});
				}
			}

			const data = {
				date: input.date,
				startTime: parseUtcTime(input.startTime),
				endTime: input.endTime ? parseUtcTime(input.endTime) : null,
				updatedAt: input.updatedAt
			};

			return ctx.prisma.$transaction(async (tx) => {
				if (existing) {
					await tx.workSessionParticipant.deleteMany({
						where: { workSessionId: existing.id }
					});
					// Full-replace when provided; omitting the field leaves the
					// captured trips and costs alone.
					if (input.transportItems) {
						await tx.workSessionTransportItem.deleteMany({
							where: { workSessionId: existing.id }
						});
					}
					return tx.workSession.update({
						where: { id: existing.id },
						data: {
							...data,
							participants: participantsCreate(input.clientIds),
							transportItems: input.transportItems
								? { create: input.transportItems }
								: undefined
						},
						select: workSessionSelect
					});
				}

				return tx.workSession.create({
					data: {
						...data,
						id: input.id,
						ownerId: ctx.session.user.id,
						participants: participantsCreate(input.clientIds),
						transportItems: input.transportItems
							? { create: input.transportItems }
							: undefined
					},
					select: workSessionSelect
				});
			});
		}),

	delete: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Scoped deleteMany keeps this idempotent for offline replays and a
			// no-op against other Providers' Sessions.
			await ctx.prisma.workSession.deleteMany({
				where: { id: input.id, ownerId: ctx.session.user.id }
			});
			return true;
		}),

	addParticipant: authedProcedure
		.input(participantChangeSchema)
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.client.assert(input.clientId);
			return splitAtPivot(ctx, input, (clientIds) => {
				if (clientIds.includes(input.clientId)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "That Client is already in this Session"
					});
				}
				return [...clientIds, input.clientId];
			});
		}),

	removeParticipant: authedProcedure
		.input(participantChangeSchema)
		.mutation(async ({ ctx, input }) => {
			return splitAtPivot(ctx, input, (clientIds) => {
				const remaining = clientIds.filter((id) => id !== input.clientId);
				if (remaining.length === clientIds.length) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "That Client is not in this Session"
					});
				}
				if (remaining.length === 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "A Session needs at least one Client - delete it instead"
					});
				}
				return remaining;
			});
		}),

	captureHandover: authedProcedure
		.input(captureHandoverSchema)
		.mutation(async ({ ctx, input }) => {
			const session = await ctx.owned.workSession.findFirst({
				where: { id: input.workSessionId },
				select: { id: true, date: true, startTime: true, updatedAt: true }
			});
			const preceding = await ctx.owned.workSession.findFirst({
				where: { id: input.precededByWorkSessionId },
				select: { id: true, date: true, endTime: true }
			});
			if (!session || !preceding) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			if (!preceding.endTime) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "The previous Session is still Open - end it first"
				});
			}
			if (
				preceding.date.getTime() !== session.date.getTime() ||
				preceding.endTime > session.startTime
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"A Handover links the previous Session to the one that starts after it on the same day"
				});
			}

			const isTravel = input.handoverType === "TRAVEL";

			const workSession = isStale(session, input.updatedAt)
				? await readBack(ctx, session.id)
				: await ctx.prisma.workSession.update({
						where: { id: session.id },
						data: {
							precededByWorkSessionId: preceding.id,
							handoverType: input.handoverType,
							interClientDistance: isTravel ? input.interClientDistance : null,
							interClientDuration: isTravel
								? (input.interClientDuration ?? null)
								: null,
							updatedAt: input.updatedAt
						},
						select: workSessionSelect
					});

			// The gap between the two stamped times is known here, so surface the
			// pre-fill and the fits-the-gap warning to the capture UI. Warn, never
			// block - the billable clamp is applied at Promotion. Computed from the
			// row as stored, so a dropped stale replay reports what actually won.
			const gapMinutes = differenceInMinutes(
				session.startTime,
				preceding.endTime
			);
			const { exceedsGap } = billableTravelDuration(
				workSession.interClientDuration === null
					? null
					: Number(workSession.interClientDuration),
				gapMinutes
			);

			return {
				workSession,
				gapMinutes,
				defaultDuration: defaultTravelDuration(gapMinutes),
				exceedsGap
			};
		}),

	recordTrip: authedProcedure
		.input(
			z.object({
				id: z.string().optional(),
				workSessionId: z.string(),
				distance: z.number().positive(),
				note: z.string().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			return createTransportItem(ctx, {
				id: input.id,
				workSessionId: input.workSessionId,
				type: "DISTANCE",
				amount: input.distance,
				note: input.note
			});
		}),

	recordCost: authedProcedure
		.input(
			z.object({
				id: z.string().optional(),
				workSessionId: z.string(),
				type: z.enum(["PARKING", "TOLL", "OTHER"]),
				amount: z.number().min(0),
				note: z.string().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			return createTransportItem(ctx, input);
		}),

	// Day-atomic Promotion: every captured Session becomes a Pending Activity
	// (group Sessions mirrored per participant sharing a groupSize) and the
	// day's Handover links assemble into a Trip whose inter-client legs bill
	// the captured distances. Consumed Sessions are deleted - the Log is a
	// pure capture layer and the Activity/Invoice world is the source of truth.
	promoteDay: authedProcedure
		.input(
			z.object({
				date: z.date(),
				// Story: override the Support Item on a promoted Activity so a
				// non-default support is still easy to bill. Keyed by Session id.
				supportItemOverrides: z.record(z.string(), z.string()).optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const sessions = await ctx.owned.workSession.findMany({
				where: { date: input.date },
				orderBy: { startTime: "asc" },
				select: {
					id: true,
					startTime: true,
					endTime: true,
					precededByWorkSessionId: true,
					handoverType: true,
					interClientDistance: true,
					interClientDuration: true,
					participants: participantsOrdered,
					transportItems: {
						select: { type: true, amount: true, note: true }
					}
				}
			});

			if (sessions.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No Sessions to promote on this day"
				});
			}
			if (sessions.some((session) => !session.endTime)) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"A Session that day is still Open - end it before promoting the day"
				});
			}

			const user = await ctx.prisma.user.findUniqueOrThrow({
				where: { id: ctx.session.user.id },
				select: { defaultSupportItemId: true, defaultGroupSupportItemId: true }
			});

			const overrides = input.supportItemOverrides ?? {};
			const supportItemIdBySession = new Map<string, string>();
			for (const session of sessions) {
				const isGroup = isGroupSession(session);
				const supportItemId =
					overrides[session.id] ??
					(isGroup
						? user.defaultGroupSupportItemId
						: user.defaultSupportItemId);
				if (!supportItemId) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: isGroup
							? "Set a default group Support Item before promoting a group Session"
							: "Set a default Support Item before promoting"
					});
				}
				supportItemIdBySession.set(session.id, supportItemId);
			}

			const supportItems = await ctx.owned.supportItem.findMany({
				where: { id: { in: [...new Set(supportItemIdBySession.values())] } },
				select: { id: true, isGroup: true }
			});
			const supportItemById = new Map(
				supportItems.map((item) => [item.id, item])
			);
			for (const session of sessions) {
				const item = supportItemById.get(
					supportItemIdBySession.get(session.id) as string
				);
				if (!item) throw new TRPCError({ code: "NOT_FOUND" });

				const isGroup = isGroupSession(session);
				if (isGroup !== (item.isGroup === true)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: isGroup
							? "A group Session needs a group Support Item"
							: "A solo Session can't bill a group Support Item"
					});
				}
			}

			// A Handover leg exists only between adjacent Sessions joined by a
			// TRAVEL link; an IN_PLACE link records no driving. The billable
			// duration applies the gap clamp - entered time is warned about at
			// capture but never bills beyond what physically fit.
			const legPlans: {
				fromSessionId: string;
				toSessionId: string;
				distance: number;
				duration: number;
			}[] = [];
			for (let i = 1; i < sessions.length; i++) {
				const previous = sessions[i - 1];
				const session = sessions[i];
				if (
					session.precededByWorkSessionId !== previous.id ||
					session.handoverType !== "TRAVEL" ||
					session.interClientDistance === null
				) {
					continue;
				}
				const gapMinutes = differenceInMinutes(
					session.startTime,
					previous.endTime as Date
				);
				const { duration } = billableTravelDuration(
					session.interClientDuration === null
						? null
						: Number(session.interClientDuration),
					gapMinutes
				);
				legPlans.push({
					fromSessionId: previous.id,
					toSessionId: session.id,
					distance: Number(session.interClientDistance),
					duration
				});
			}

			// One Activity per participant, in Session order. The primary
			// participant - the first by the deterministic participant order - is
			// the one that carries the Session's transport and joins the Trip.
			const drafts: ActivityDraft[] = [];
			const primarySessionIdByDraft = new Map<number, string>();
			for (const session of sessions) {
				const groupSize = isGroupSession(session)
					? session.participants.length
					: undefined;
				const supportItemId = supportItemIdBySession.get(session.id);
				if (!supportItemId) continue; // unreachable: seeded above

				for (const [index, participant] of session.participants.entries()) {
					const isPrimary = index === 0;
					if (isPrimary) primarySessionIdByDraft.set(drafts.length, session.id);
					drafts.push({
						clientId: participant.clientId,
						supportItemId,
						date: input.date,
						startTime: session.startTime,
						endTime: session.endTime ?? undefined,
						groupSize,
						// The Session's trips and costs bill once, on the primary
						// participant's Activity - mirrors share the support time, not
						// the transport.
						transportItems: isPrimary ? session.transportItems : undefined
					});
				}
			}

			return ctx.prisma.$transaction(async (tx) => {
				// Provider Travel bills once per Session, on the primary Activity:
				// mirrors never join the Trip. Home legs derive from the Clients'
				// stored distances through the same allocation engine as manually
				// assembled days.
				const { activities, tripId } = await createActivityBatch(
					tx,
					ctx.session.user.id,
					drafts,
					(created) => {
						const primaryBySessionId = new Map<string, CreatedActivity>();
						created.forEach((activity, index) => {
							const sessionId = primarySessionIdByDraft.get(index);
							if (sessionId) primaryBySessionId.set(sessionId, activity);
						});

						const legs = legPlans.flatMap((leg) => {
							const from = primaryBySessionId.get(leg.fromSessionId);
							const to = primaryBySessionId.get(leg.toSessionId);
							if (!from || !to) return []; // unreachable: legs link loaded sessions
							return [
								{
									fromActivityId: from.id,
									toActivityId: to.id,
									distance: leg.distance,
									duration: leg.duration
								}
							];
						});

						return { activities: [...primaryBySessionId.values()], legs };
					}
				);

				await tx.workSession.deleteMany({
					where: { id: { in: sessions.map((session) => session.id) } }
				});

				return { activityIds: activities.map((a) => a.id), tripId };
			});
		}),

	// The per-Client sections of the Log tab, mirroring the notes-app habit.
	// Every active Client keeps a section - standing scaffolding - even with no
	// current Sessions; a group Session appears under each of its participants.
	// A deactivated Client keeps their section while unpromoted Sessions remain,
	// so captured work never silently disappears from the Log.
	listByClient: authedProcedure.query(async ({ ctx }) => {
		const clients = await ctx.owned.client.findMany({
			where: { OR: [{ active: true }, { workSessions: { some: {} } }] },
			select: { id: true, name: true },
			orderBy: { name: "asc" }
		});

		const sessions = await ctx.owned.workSession.findMany({
			select: workSessionSelect,
			orderBy: [{ date: "asc" }, { startTime: "asc" }]
		});

		return clients.map((client) => ({
			client,
			sessions: sessions.filter((session) =>
				session.participants.some((p) => p.clientId === client.id)
			)
		}));
	}),

	listByDay: authedProcedure
		.input(z.object({ date: z.date() }))
		.query(async ({ ctx, input }) => {
			return ctx.owned.workSession.findMany({
				where: { date: input.date },
				select: workSessionSelect,
				orderBy: { startTime: "asc" }
			});
		})
});

export type LogRouterOutput = inferRouterOutputs<typeof logRouter>;
