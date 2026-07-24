import { stripTimezone } from "@/lib/date-utils";
import {
	activitySchema,
	activityTransportItemSchema,
	type ActivitySchema,
	type ActivityTransportItemSchema
} from "@/schema/activity-schema";
import { totalGroupSize } from "@/schema/invoice-schema";
import { z } from "zod";

/**
 * The quick-entry form model (`multi-activity-form.tsx`) and its submit-payload
 * builder, kept free of React/tRPC so the payload contract — the highest-risk
 * part of plan 030 — can be asserted directly in unit tests.
 *
 * Each row derives its time-order rule from `activitySchema` (see the
 * superRefine below), so the schema change that fixes the server also reaches
 * this form. The two can never silently disagree.
 */
export const activityRowSchema = z
	.object({
		clientId: z.string(),
		isGroup: z.boolean(),
		groupClientIds: z.array(z.string()),
		timeRange: z.object({
			startTime: z.string(),
			endTime: z.string()
		}),
		transportKm: z.number().optional(),
		transportItems: z.array(activityTransportItemSchema),
		supportItemId: z.string()
	})
	.superRefine((row, ctx) => {
		// Empty rows are dropped before submit, so they never block the form.
		if (isEmptyRow(row)) return;

		if (!row.clientId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Client is required",
				path: ["clientId"]
			});
		}

		if (row.isGroup && row.groupClientIds.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "At least one other participant is required",
				path: ["groupClientIds"]
			});
		}

		if (!row.timeRange.startTime || !row.timeRange.endTime) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Time range is required",
				path: ["timeRange"]
			});
		} else {
			// Derive the time-order rule from activitySchema so the form enforces
			// exactly what the server does (including plan 019's midnight refine).
			const result = activitySchema.safeParse({
				clientId: "placeholder",
				supportItemId: "placeholder",
				date: stripTimezone(new Date()),
				startTime: row.timeRange.startTime,
				endTime: row.timeRange.endTime
			});
			if (!result.success) {
				const timeIssue = result.error.issues.find(
					(issue) =>
						issue.path[0] === "endTime" || issue.path[0] === "startTime"
				);
				if (timeIssue) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: timeIssue.message,
						path: ["timeRange"]
					});
				}
			}
		}
	});

export const multiActivityFormSchema = z.object({
	date: z.date(),
	activities: z.array(activityRowSchema)
});

export type MultiActivityFormModel = z.infer<typeof multiActivityFormSchema>;
export type ActivityRowModel = z.infer<typeof activityRowSchema>;

export function createEmptyRow(): ActivityRowModel {
	return {
		clientId: "",
		isGroup: false,
		groupClientIds: [],
		timeRange: { startTime: "", endTime: "" },
		transportKm: undefined,
		transportItems: [],
		supportItemId: ""
	};
}

/** A row is empty (and dropped before submit) when it has no client or times. */
export function isEmptyRow(row: ActivityRowModel): boolean {
	return !row.clientId && !row.timeRange.startTime && !row.timeRange.endTime;
}

export interface BulkAddDefaults {
	defaultSupportItemId?: string;
	defaultGroupSupportItemId?: string;
}

export interface BulkAddPayload {
	activities: ActivitySchema[];
	autoCreateTrip: boolean;
}

/**
 * Build the `activity.bulkAdd` payload from the form rows. Empty rows are
 * dropped; a group row emits the primary client's activity plus one per other
 * participant (participants carry no transport items). `autoCreateTrip` is off
 * whenever any group activity is present, matching the original hand-rolled
 * form exactly — this shape is a fixed server contract.
 */
export function buildBulkAddPayload(
	rows: ActivityRowModel[],
	date: Date,
	{ defaultSupportItemId, defaultGroupSupportItemId }: BulkAddDefaults
): BulkAddPayload {
	const nonEmptyRows = rows.filter((row) => !isEmptyRow(row));

	const activities: ActivitySchema[] = [];
	let hasGroupActivities = false;

	nonEmptyRows.forEach((row) => {
		const transportItems: ActivityTransportItemSchema[] = [];

		// Add distance transport item if specified
		if (row.transportKm && row.transportKm > 0) {
			transportItems.push({
				type: "DISTANCE",
				amount: row.transportKm
			});
		}

		// Add other transport items (parking, toll, etc)
		transportItems.push(
			...row.transportItems.filter((item) => item.amount > 0)
		);

		// Use group support item for group activities, otherwise use default
		const supportItemId = row.isGroup
			? row.supportItemId || defaultGroupSupportItemId || ""
			: row.supportItemId || defaultSupportItemId || "";

		const groupSize =
			row.isGroup && row.groupClientIds.length > 0
				? totalGroupSize(row.groupClientIds)
				: undefined;

		// Primary client activity (always created)
		activities.push({
			clientId: row.clientId,
			date: stripTimezone(date),
			startTime: row.timeRange.startTime,
			endTime: row.timeRange.endTime,
			supportItemId,
			groupSize,
			transportItems: transportItems.length > 0 ? transportItems : undefined
		});

		// Other participants' activities (only for group activities)
		if (row.isGroup && row.groupClientIds.length > 0) {
			hasGroupActivities = true;
			for (const groupClientId of row.groupClientIds) {
				activities.push({
					clientId: groupClientId,
					date: stripTimezone(date),
					startTime: row.timeRange.startTime,
					endTime: row.timeRange.endTime,
					supportItemId,
					groupSize
					// No transport items for other participants
				});
			}
		}
	});

	return { activities, autoCreateTrip: !hasGroupActivities };
}
