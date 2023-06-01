import { Prisma } from "@prisma/client";
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
	transitDistance?: number | null;
	transitDuration?: number | null;
	supportItem: {
		description?: string;
		weekdayCode: string;
		weekdayRate: Prisma.Decimal | string;
		weeknightCode?: string | null;
		weeknightRate?: Prisma.Decimal | null;
		saturdayCode?: string | null;
		saturdayRate?: Prisma.Decimal | null;
		sundayCode?: string | null;
		sundayRate?: Prisma.Decimal | null;
	};
}

export const getRate = (activity: Activity): [code: string, rate: number] => {
	let rate = new Prisma.Decimal(0);
	let itemCode = "";

	if (
		dayjs.utc(activity.date).day() === 6 &&
		activity.supportItem.saturdayRate &&
		activity.supportItem.saturdayCode?.length
	) {
		// Saturday
		rate =
			typeof activity.supportItem.saturdayRate === "string"
				? new Prisma.Decimal(activity.supportItem.saturdayRate)
				: activity.supportItem.saturdayRate;
		itemCode = activity.supportItem.saturdayCode;
	} else if (
		dayjs.utc(activity.date).day() === 0 &&
		activity.supportItem.sundayRate &&
		activity.supportItem.sundayRate &&
		activity.supportItem.sundayCode?.length
	) {
		// Sunday
		rate =
			typeof activity.supportItem.sundayRate === "string"
				? new Prisma.Decimal(activity.supportItem.sundayRate)
				: activity.supportItem.sundayRate;
		itemCode = activity.supportItem.sundayCode;
	} else if (
		activity.endTime &&
		activity.supportItem.weeknightCode?.length &&
		activity.supportItem.weeknightRate &&
		dayjs.utc(activity.endTime).hour() >= 19
	) {
		// Day is a weekday and it's after 8pm
		rate =
			typeof activity.supportItem.weeknightRate === "string"
				? new Prisma.Decimal(activity.supportItem.weeknightRate)
				: activity.supportItem.weeknightRate;
		itemCode = activity.supportItem.weeknightCode;
	} else {
		// Weekday before 8pm
		rate =
			typeof activity.supportItem.weekdayRate === "string"
				? new Prisma.Decimal(activity.supportItem.weekdayRate)
				: activity.supportItem.weekdayRate;
		itemCode = activity.supportItem.weekdayCode;
	}

	return [itemCode, Number(rate)];
};

export const getTotalCostOfActivities = (activities: Activity[]) => {
	const grandTotal = activities
		.map((activity) => {
			const [, rate] = getRate(activity);

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
				subTotal += round(activity.transitDistance * ratePerKm, 2);
			}

			if (activity.transitDuration) {
				subTotal += round(activity.transitDuration * (Number(rate) / 60), 2);
			}

			return subTotal;
		})
		.reduce((previous, current) => previous + current, 0);

	return round(grandTotal, 2);
};
