import { z } from "zod";

export const timeOfDaySchema = z
	.string()
	.regex(/^\d{2}:\d{2}$/, "Time must be HH:mm");
const timeOfDay = timeOfDaySchema;

// All Log writes accept a client-generated id (a cuid minted on-device) so
// offline captures have stable identity when the sync client replays them.
export const workSessionStartSchema = z.object({
	id: z.string().optional(),
	date: z.date({ required_error: "Date is required" }),
	startTime: timeOfDay,
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
export const workSessionEditSchema = workSessionStartSchema
	.extend({
		id: z.string(),
		endTime: timeOfDay.nullish()
	})
	.refine((data) => !data.endTime || data.startTime < data.endTime, {
		message:
			"End time must be after start time — Sessions can't cross midnight",
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
		interClientDuration: z.number().min(0).nullish()
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
