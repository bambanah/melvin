import { parseUtcTime, utcDate } from "@/lib/date-utils";
import { standaloneTransitFields } from "@/lib/trip-utils";
import { regularTimeSchema } from "@/schema/regular-time-schema";
import { createActivityBatch } from "@/server/api/activity-creation";
import { authedProcedure, router } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { format } from "date-fns";
import { z } from "zod";

// The server can't see the Provider's timezone, so a date is only future once
// no timezone (UTC+14 is the furthest ahead) has reached it yet.
function latestToday() {
	const ahead = new Date(Date.now() + 14 * 60 * 60 * 1000);
	return new Date(
		Date.UTC(ahead.getUTCFullYear(), ahead.getUTCMonth(), ahead.getUTCDate())
	);
}

export const regularTimeRouter = router({
	list: authedProcedure.query(({ ctx }) =>
		ctx.prisma.regularTime.findMany({
			where: { client: { ownerId: ctx.session.user.id, active: true } },
			select: {
				clientId: true,
				startTime: true,
				endTime: true,
				claimsTravel: true,
				client: { select: { name: true } }
			},
			orderBy: { client: { name: "asc" } }
		})
	),
	set: authedProcedure
		.input(z.object({ clientId: z.string(), regularTime: regularTimeSchema }))
		.mutation(async ({ ctx, input }) => {
			const { clientId, regularTime } = input;
			await ctx.owned.client.assert(clientId);

			// A per-km item bills its own distance, which a time span has nowhere to
			// hold; a group item needs a participant set.
			const supportItem = await ctx.owned.supportItem.findFirst({
				where: { id: regularTime.supportItemId },
				select: { rateType: true, isGroup: true }
			});
			if (!supportItem) throw new TRPCError({ code: "NOT_FOUND" });
			if (supportItem.rateType !== "HOUR" || supportItem.isGroup) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A regular time takes a solo, hourly Support Item"
				});
			}

			const data = {
				startTime: parseUtcTime(regularTime.startTime),
				endTime: parseUtcTime(regularTime.endTime),
				supportItemId: regularTime.supportItemId,
				claimsTravel: regularTime.claimsTravel
			};

			return ctx.prisma.regularTime.upsert({
				where: { clientId },
				create: { clientId, ...data },
				update: data
			});
		}),
	clear: authedProcedure
		.input(z.object({ clientId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.owned.client.assert(input.clientId);

			await ctx.prisma.regularTime.deleteMany({
				where: { clientId: input.clientId }
			});
		}),
	applyToDates: authedProcedure
		.input(z.object({ clientId: z.string(), dates: z.array(z.date()).min(1) }))
		.mutation(async ({ ctx, input }) => {
			// A future Pending Activity would be swept into the next Invoice before
			// the work happened.
			const latest = latestToday();
			if (input.dates.some((date) => date > latest)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A regular time can't be applied to a future date"
				});
			}

			const client = await ctx.owned.client.findFirst({
				where: { id: input.clientId },
				select: {
					distanceToClient: true,
					travelTimeToClient: true,
					regularTime: true
				}
			});
			if (!client?.regularTime) throw new TRPCError({ code: "NOT_FOUND" });
			const { regularTime } = client;
			const travel = regularTime.claimsTravel
				? standaloneTransitFields(client)
				: {};

			const drafts = input.dates.map((date) => ({
				clientId: input.clientId,
				supportItemId: regularTime.supportItemId,
				date,
				startTime: regularTime.startTime,
				endTime: regularTime.endTime,
				...travel
			}));

			// The Regular Time fixes the travel, so nothing joins a Trip.
			const { activities } = await ctx.prisma.$transaction((tx) =>
				createActivityBatch(tx, ctx.session.user.id, drafts, () => null)
			);

			return { count: activities.length };
		}),
	/** The `dates` already holding an Activity for the Client, as yyyy-MM-dd. */
	datesWithActivity: authedProcedure
		.input(z.object({ clientId: z.string(), dates: z.array(z.date()) }))
		.query(async ({ ctx, input }) => {
			const activities = await ctx.owned.activity.findMany({
				where: { clientId: input.clientId, date: { in: input.dates } },
				select: { date: true },
				distinct: ["date"]
			});

			return activities
				.map((activity) => format(utcDate(activity.date), "yyyy-MM-dd"))
				.sort();
		})
});
