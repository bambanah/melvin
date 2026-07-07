// Type-only: this module is bundled into the client (via activity-utils.ts's
// UI callers), so it must not pull in the generated Prisma client's runtime
// (@prisma/client imports node:module, which the browser bundle can't have).
import type {
	ActivityTransportType,
	Prisma,
	RateType,
	SupportItem,
	SupportItemRates
} from "@/generated/client";
import { formatDuration, getDuration } from "./date-utils";
import { floorToCent, round } from "./generic-utils";
import {
	getActivityBasedTransportCode,
	getNonLabourTravelCode
} from "./support-item-utils";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

interface TransportItem {
	type: ActivityTransportType;
	amount: Prisma.Decimal | number;
	note?: string | null;
}

export interface BillableActivity {
	id?: string;
	date: Date;
	startTime?: Date | null;
	endTime?: Date | null;
	itemDistance?: number | null;
	transitDistance?: Prisma.Decimal | null;
	transitDuration?: Prisma.Decimal | null;
	groupSize?: number | null;
	transportItems?: TransportItem[];
	supportItem: Pick<
		SupportItem,
		| "weekdayCode"
		| "weeknightCode"
		| "saturdayCode"
		| "sundayCode"
		| "weekdayRate"
		| "weeknightRate"
		| "saturdayRate"
		| "sundayRate"
		| "isGroup"
	> & {
		rateType?: RateType;
		supportItemRates?: Pick<
			SupportItemRates,
			"weekdayRate" | "weeknightRate" | "saturdayRate" | "sundayRate"
		>[];
		description?: string;
	};
	client?: {
		transitRatePerKm?: Prisma.Decimal | null;
	} | null;
}

export interface TransitRateContext {
	userTransitRatePerKm?: number;
}

const DEFAULT_TRANSIT_RATE = 0.99;

const DEFAULT_ACTIVITY_TRANSPORT_RATE = 0.99;

/**
 * The number of participants a group activity's rate is divided across.
 * Defaults to 2 for group activities created before `groupSize` existed
 * (docs/plans/016). Non-group activities always have a single participant.
 */
export function groupSizeOf(activity: BillableActivity): number {
	return activity.supportItem.isGroup ? (activity.groupSize ?? 2) : 1;
}

/**
 * A group activity's per-participant share of `rate`, floored to the cent so
 * the summed claim across participants never exceeds the base (docs/plans/016).
 * The full rate for non-group activities. This is the single place the isGroup
 * gate and the floor policy live — every apportioned rate goes through here.
 */
function apportion(rate: number, activity: BillableActivity): number {
	return activity.supportItem.isGroup
		? floorToCent(rate / groupSizeOf(activity))
		: rate;
}

const getRateForDay = (
	day: "weekday" | "weeknight" | "saturday" | "sunday",
	supportItem: BillableActivity["supportItem"],
	supportItemRates?: BillableActivity["supportItem"]["supportItemRates"]
) => {
	const customRate = supportItemRates?.find((r) => r[`${day}Rate`])?.[
		`${day}Rate`
	];

	return customRate || supportItem[`${day}Rate`];
};

/** The support item code + rate for an activity's own SUPPORT line. */
export const getRateForActivity = (
	activity: BillableActivity
): [code: string, rate: number] => {
	// Saturday
	if (
		dayjs.utc(activity.date).day() === 6 &&
		activity.supportItem.saturdayCode?.length
	) {
		const rate = getRateForDay(
			"saturday",
			activity.supportItem,
			activity.supportItem.supportItemRates
		);

		if (rate) {
			return [activity.supportItem.saturdayCode, Number(rate)];
		}
	}

	// Sunday
	if (
		dayjs.utc(activity.date).day() === 0 &&
		activity.supportItem.sundayCode?.length
	) {
		const rate = getRateForDay(
			"sunday",
			activity.supportItem,
			activity.supportItem.supportItemRates
		);

		if (rate) {
			return [activity.supportItem.sundayCode, Number(rate)];
		}
	}

	if (
		activity.endTime &&
		dayjs.utc(activity.endTime).hour() >= 20 &&
		activity.supportItem.weeknightCode?.length &&
		activity.supportItem.weeknightRate
	) {
		// Day is a weekday and it's 8pm or later
		const rate = getRateForDay(
			"weeknight",
			activity.supportItem,
			activity.supportItem.supportItemRates
		);

		if (rate) {
			return [activity.supportItem.weeknightCode, Number(rate)];
		}
	}

	// Weekday before 8pm
	const rate = getRateForDay(
		"weekday",
		activity.supportItem,
		activity.supportItem.supportItemRates
	);

	return [activity.supportItem.weekdayCode, Number(rate)];
};

/** The effective non-labour travel rate per km: client → user → default, apportioned by group size. */
export function getTransitRate(
	activity: BillableActivity,
	rateContext?: TransitRateContext
): number {
	const effectiveRate =
		Number(activity.client?.transitRatePerKm) ||
		rateContext?.userTransitRatePerKm ||
		DEFAULT_TRANSIT_RATE;

	return apportion(effectiveRate, activity);
}

export type LineKind =
	| "SUPPORT"
	| "TRAVEL_TIME"
	| "TRAVEL_KM"
	| "ABT"
	| "EXPENSE";

export interface BillableLine {
	kind: LineKind;
	description: string;
	supportItemCode: string;
	serviceDate: Date;
	quantity: number; // hours, km, minutes (TRAVEL_TIME), or 1 for EXPENSE — see `unit`
	unit: "HOUR" | "KM" | "MINUTE" | "EACH";
	unitPrice: number; // 0-decimal-safe number; EXPENSE lines: unitPrice = amount
	total: number; // round(quantity * unitPrice, 2), or face value for EXPENSE
	activityId?: string;
	// Rendering-only metadata for the one case display can't reconstruct from
	// the fields above: the flat transport expense's type/note. Not part of
	// the persisted shape TRD-006 will store.
	transportType?: ActivityTransportType;
	note?: string | null;
}

/**
 * The single implementation of "what a line on an invoice costs". Everything
 * that needs to know an activity's cost — the printed PDF rows, the printed
 * Total, and any UI total — computes it by summing these lines.
 */
export function billableLines(
	activity: BillableActivity,
	rateContext?: TransitRateContext
): BillableLine[] {
	const lines: BillableLine[] = [];
	const [itemCode, resolvedRate] = getRateForActivity(activity);
	// Apportioned once so the support line, its printed unit price, and the
	// labour-travel rate/60 all use the same per-participant figure.
	const rate = apportion(resolvedRate, activity);

	// SUPPORT: gated on rateType like the PDF (the printed truth), not on
	// which fields happen to be populated. A KM-rate item always bills by
	// itemDistance, even if it also has a time span (docs/plans/007).
	if (activity.supportItem.rateType === "KM") {
		if (activity.itemDistance) {
			lines.push({
				kind: "SUPPORT",
				description: activity.supportItem.description ?? "",
				supportItemCode: itemCode,
				serviceDate: activity.date,
				quantity: activity.itemDistance,
				unit: "KM",
				unitPrice: Number(rate),
				total: round(Number(rate) * activity.itemDistance, 2),
				activityId: activity.id
			});
		}
	} else if (activity.startTime && activity.endTime) {
		const duration = getDuration(activity.startTime, activity.endTime);

		lines.push({
			kind: "SUPPORT",
			description: activity.supportItem.description ?? "",
			supportItemCode: itemCode,
			serviceDate: activity.date,
			quantity: duration,
			unit: "HOUR",
			unitPrice: Number(rate),
			total: round(Number(rate) * duration, 2),
			activityId: activity.id
		});
	} else if (activity.itemDistance) {
		lines.push({
			kind: "SUPPORT",
			description: activity.supportItem.description ?? "",
			supportItemCode: itemCode,
			serviceDate: activity.date,
			quantity: activity.itemDistance,
			unit: "KM",
			unitPrice: Number(rate),
			total: round(Number(rate) * activity.itemDistance, 2),
			activityId: activity.id
		});
	}

	// Provider Travel - Labour Costs
	if (activity.transitDuration) {
		const minutes = Number(activity.transitDuration);

		lines.push({
			kind: "TRAVEL_TIME",
			description: "Provider travel - labour costs",
			supportItemCode: itemCode,
			serviceDate: activity.date,
			quantity: minutes,
			unit: "MINUTE",
			unitPrice: Number(rate),
			total: round((Number(rate) / 60) * minutes, 2),
			activityId: activity.id
		});
	}

	// Provider Travel - Non Labour Costs
	if (activity.transitDistance) {
		const km = Number(activity.transitDistance);
		const ratePerKm = getTransitRate(activity, rateContext);

		lines.push({
			kind: "TRAVEL_KM",
			description: "Provider travel - non-labour costs",
			supportItemCode:
				getNonLabourTravelCode(activity.supportItem.weekdayCode) ?? "",
			serviceDate: activity.date,
			quantity: km,
			unit: "KM",
			unitPrice: ratePerKm,
			total: round(km * ratePerKm, 2),
			activityId: activity.id
		});
	}

	// Activity Based Transport items
	if (activity.transportItems) {
		const activityTransportRate = apportion(
			DEFAULT_ACTIVITY_TRANSPORT_RATE,
			activity
		);
		const transportCode =
			getActivityBasedTransportCode(activity.supportItem.weekdayCode) ?? "";

		for (const item of activity.transportItems) {
			const amount = Number(item.amount);

			if (item.type === "DISTANCE") {
				lines.push({
					kind: "ABT",
					description: "Activity Based Transport",
					supportItemCode: transportCode,
					serviceDate: activity.date,
					quantity: amount,
					unit: "KM",
					unitPrice: activityTransportRate,
					total: round(amount * activityTransportRate, 2),
					activityId: activity.id
				});
			} else {
				lines.push({
					kind: "EXPENSE",
					description: "Activity Based Transport",
					supportItemCode: transportCode,
					serviceDate: activity.date,
					quantity: 1,
					unit: "EACH",
					unitPrice: amount,
					total: round(amount, 2),
					activityId: activity.id,
					transportType: item.type,
					note: item.note
				});
			}
		}
	}

	return lines;
}

const EXPENSE_TYPE_LABELS: Record<string, string> = {
	PARKING: "Parking",
	TOLL: "Toll",
	OTHER: "Other Transport Expense"
};

/**
 * The printed Unit Price column's suffix ("/hr" or "/km"), or `undefined`
 * for EXPENSE lines (no unit price printed). TRAVEL_TIME follows the
 * activity's own `rateType`, not this line's `unit` (which is always
 * MINUTE) — everything else follows `unit` directly. Frozen into
 * `InvoiceVersion` content at send time (docs/plans/017) alongside
 * `lineDetailsText` so later changes here don't retroactively alter
 * historic invoices' rendered text.
 */
export function lineUnitPriceSuffix(
	line: BillableLine,
	activity: BillableActivity
): "hr" | "km" | undefined {
	switch (line.kind) {
		case "SUPPORT":
			return line.unit === "HOUR" ? "hr" : "km";
		case "TRAVEL_TIME":
			return activity.supportItem.rateType === "HOUR" ? "hr" : "km";
		case "TRAVEL_KM":
		case "ABT":
			return "km";
		case "EXPENSE":
			return undefined;
	}
}

/**
 * The printed Details-column text for a line. Frozen into `InvoiceVersion`
 * content at send time (docs/plans/017) so later changes here don't
 * retroactively alter historic invoices' rendered text.
 */
export function lineDetailsText(
	line: BillableLine,
	activity: BillableActivity
): string {
	switch (line.kind) {
		case "SUPPORT": {
			if (line.unit === "HOUR") {
				return `${dayjs
					.utc(activity.startTime ?? undefined)
					.format("HH:mm")}-${dayjs
					.utc(activity.endTime ?? undefined)
					.format("HH:mm")} (${formatDuration(line.quantity)})`;
			}

			return `${line.quantity} km`;
		}
		case "TRAVEL_TIME":
			return `${line.quantity} minutes`;
		case "TRAVEL_KM":
		case "ABT":
			return `${line.quantity} km`;
		case "EXPENSE": {
			const label =
				EXPENSE_TYPE_LABELS[line.transportType ?? ""] ??
				line.transportType ??
				"";

			return `${label}${line.note ? ` - ${line.note}` : ""}`;
		}
	}
}
