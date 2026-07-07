import type {
	ActivityTransportType,
	Prisma,
	SupportItem,
	SupportItemRates
} from "@/generated/client";
import { getDuration } from "./date-utils";
import { round } from "./generic-utils";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

interface TransportItem {
	type: ActivityTransportType;
	amount: Prisma.Decimal | number;
	note?: string | null;
}

interface Activity {
	date: Date;
	startTime?: Date | null;
	endTime?: Date | null;
	itemDistance?: number | null;
	transitDistance?: Prisma.Decimal | null;
	transitDuration?: Prisma.Decimal | null;
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

interface TransitRateContext {
	userTransitRatePerKm?: number;
}

const DEFAULT_TRANSIT_RATE = 0.99;

// TODO: Handle groups other than 2 clients
const GROUP_TRANSIT_RATE = 0.43;

const getRateForDay = (
	day: "weekday" | "weeknight" | "saturday" | "sunday",
	supportItem: Activity["supportItem"],
	supportItemRates?: Activity["supportItem"]["supportItemRates"]
) => {
	const customRate = supportItemRates?.find((r) => r[`${day}Rate`])?.[
		`${day}Rate`
	];

	return customRate || supportItem[`${day}Rate`];
};

export const getRateForActivity = (
	activity: Activity
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

const DEFAULT_ACTIVITY_TRANSPORT_RATE = 0.99;

export const getTotalCostOfActivities = (
	activities: Activity[],
	rateContext?: TransitRateContext
) => {
	const grandTotal = activities
		.map((activity) => {
			const [, rate] = getRateForActivity(activity);

			let subTotal = 0;

			if (activity.startTime && activity.endTime) {
				const duration = getDuration(activity.startTime, activity.endTime);

				subTotal += round(duration * Number(rate), 2);
			} else if (activity.itemDistance) {
				subTotal += round(activity.itemDistance * Number(rate), 2);
			}

			if (activity.transitDistance) {
				const ratePerKm = getTransitRate(activity, rateContext);
				subTotal += round(Number(activity.transitDistance) * ratePerKm, 2);
			}

			if (activity.transitDuration) {
				subTotal += round(
					Number(activity.transitDuration) * (Number(rate) / 60),
					2
				);
			}

			if (activity.transportItems) {
				const isGroup = activity.supportItem.isGroup;
				const activityTransportRate = isGroup
					? 0.49
					: DEFAULT_ACTIVITY_TRANSPORT_RATE;
				for (const item of activity.transportItems) {
					if (item.type === "DISTANCE") {
						subTotal += round(Number(item.amount) * activityTransportRate, 2);
					} else {
						subTotal += round(Number(item.amount), 2);
					}
				}
			}

			return subTotal;
		})
		.reduce((previous, current) => previous + current, 0);

	return round(grandTotal, 2);
};

export function getTransitRate(
	activity: Activity,
	rateContext?: TransitRateContext
): number {
	if (activity.supportItem.isGroup) {
		return GROUP_TRANSIT_RATE;
	}

	return (
		Number(activity.client?.transitRatePerKm) ||
		rateContext?.userTransitRatePerKm ||
		DEFAULT_TRANSIT_RATE
	);
}
