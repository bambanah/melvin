import { requiredDate } from "@/schema/fields";
import { z } from "zod";

export const timeOfDaySchema = z
	.string()
	.regex(/^\d{2}:\d{2}$/, "Time must be HH:mm");

// Rule messages shared by the router and the on-device store, which mirrors
// the router's guards at tap time - one wording for both rejections.
export const END_AFTER_START_MESSAGE =
	"End time must be after start time - Sessions can't cross midnight";
export const OPEN_SESSION_EDIT_MESSAGE =
	"Another Session is already Open - end it before leaving this one Open";

// Mirrors ActivityTransportItem: a logged trip is a DISTANCE item (km),
// parking/toll/other are flat Transport Expenses (dollars).
export const workSessionTransportItemSchema = z.object({
	id: z.string().optional(),
	type: z.enum(["DISTANCE", "PARKING", "TOLL", "OTHER"]),
	amount: z.number().min(0),
	note: z.string().optional()
});

// All Log writes accept a client-generated id (minted on-device, a UUID in
// practice) so offline captures have stable identity when the sync client
// replays them.
export const workSessionStartSchema = z.object({
	id: z.string().optional(),
	date: requiredDate("Date is required"),
	startTime: timeOfDaySchema,
	// The client's tap-time stamp: offline captures are stamped when made, not
	// when they sync, and last-write-wins compares these stamps.
	updatedAt: z.date().optional(),
	clientIds: z
		.array(z.string())
		.min(1, "A Session needs at least one Client")
		.refine(
			(ids) => new Set(ids).size === ids.length,
			"Session Clients must be distinct"
		)
});
export type WorkSessionStartSchema = z.infer<typeof workSessionStartSchema>;

// Full-replace upsert: covers correcting any field of a captured Session and
// backfilling a past-dated one with typed times. `updatedAt` is the client's
// stamp for last-write-wins conflict resolution on offline replays.
// `transportItems` replaces the Session's trips and costs when provided;
// omitting it leaves them untouched.
export const workSessionEditSchema = workSessionStartSchema
	.extend({
		id: z.string(),
		endTime: timeOfDaySchema.nullish(),
		transportItems: z.array(workSessionTransportItemSchema).optional()
	})
	.refine((data) => !data.endTime || data.startTime < data.endTime, {
		message: END_AFTER_START_MESSAGE,
		path: ["endTime"]
	});
export type WorkSessionEditSchema = z.infer<typeof workSessionEditSchema>;

// Captured at the *next* Start, once both sides of the gap are known. A
// TRAVEL Handover requires the driven distance; the duration is optional and
// defaults to the gap (clamped to the Travel Time Cap) at Promotion. An
// IN_PLACE Handover records no driving.
export const captureHandoverSchema = z
	.object({
		workSessionId: z.string(),
		precededByWorkSessionId: z.string(),
		handoverType: z.enum(["TRAVEL", "IN_PLACE"]),
		interClientDistance: z.number().positive().optional(),
		interClientDuration: z.number().min(0).nullish(),
		// Tap-time stamp. Every write that touches a WorkSession row must carry
		// it: letting @updatedAt default to sync-arrival time would make any
		// later-queued op with an earlier tap stamp look stale and be dropped
		// by last-write-wins.
		updatedAt: z.date().optional()
	})
	.refine(
		(data) =>
			data.handoverType !== "TRAVEL" || data.interClientDistance !== undefined,
		{
			message: "Distance is required for a travel Handover",
			path: ["interClientDistance"]
		}
	);
export type CaptureHandoverSchema = z.infer<typeof captureHandoverSchema>;
