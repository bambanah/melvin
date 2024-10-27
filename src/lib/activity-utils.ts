import { Prisma, SupportItem, SupportItemRates } from "@prisma/client";
import { getDuration } from "./date-utils";
import { round } from "./generic-utils";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

interface Activity {
	date: Date;
	startTime?: Date | null;
	endTime?: Date | null;
	itemDistance?: number | null;
	transitDistance?: Prisma.Decimal | null;
	transitDuration?: Prisma.Decimal | null;
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
	> & {
		supportItemRates?: Pick<
			SupportItemRates,
			"weekdayRate" | "weeknightRate" | "saturdayRate" | "sundayRate"
		>[];
		description?: string;
	};
}

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
		dayjs.utc(activity.endTime).hour() >= 19 &&
		activity.supportItem.weeknightCode?.length &&
		activity.supportItem.weeknightRate
	) {
		// Day is a weekday and it's after 8pm
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

export const getTotalCostOfActivities = (activities: Activity[]) => {
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
				const isGroup =
					activity.supportItem.description?.includes("Group Activities");
				const ratePerKm = isGroup ? 0.43 : 0.85;
				subTotal += round(Number(activity.transitDistance) * ratePerKm, 2);
			}

			if (activity.transitDuration) {
				subTotal += round(
					Number(activity.transitDuration) * (Number(rate) / 60),
					2
				);
			}

			return subTotal;
		})
		.reduce((previous, current) => previous + current, 0);

	return round(grandTotal, 2);
};
