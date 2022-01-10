import { FormikErrors, FormikTouched, getIn } from "formik";
import dayjs from "dayjs";

export const formatDate = (date: Date) => {
	const YYYY = date.getFullYear();
	const MM = `0${date.getMonth() + 1}`.slice(-2);
	const DD = `0${date.getDate()}`.slice(-2);

	return `${DD}/${MM}/${YYYY}`;
};

export const getDuration = (startTime: string, endTime: string): number => {
	const startDate = dayjs("1970-01-01T" + startTime, "YYYY-MM-DDTHH:mm");
	const endDate = dayjs("1970-01-01T" + endTime, "YYYY-MM-DDTHH:mm");

	const diffInMinutes = Math.abs(startDate.diff(endDate, "minutes"));
	const diffInHours = diffInMinutes / 60;

	return Math.round(diffInHours * 1000) / 1000;
};

export const getPrettyDuration = (duration: number) => {
	const hourItem = dayjs()
		.set("hours", duration)
		.set("minutes", (duration % 1) * 60);

	let durationString = "";

	const hours = hourItem.get("hours");
	const minutes = hourItem.get("minutes");
	if (hours > 0) durationString += `${hours} hour${hours === 1 ? "" : "s"}`;

	if (minutes > 0)
		durationString = `${
			durationString.length > 0 ? `${durationString}, ` : ""
		}${minutes} min${minutes === 1 ? "" : "s"}`;

	return durationString;
};

export const getRate = async (
	activityId: string
): Promise<[code: string, rate: number]> => {
	return [activityId, 1];
	// const activity = await prisma.activity.findFirst({
	// 	where: {
	// 		id: activityId,
	// 	},
	// 	include: {
	// 		supportItem: true,
	// 	},
	// });

	// if (!activity || !activity.supportItem) return ["", 0];

	// const { supportItem } = activity;

	// if (
	// 	moment(activity.date).day() === 0 &&
	// 	supportItem.sundayCode &&
	// 	supportItem.sundayRate
	// ) {
	// 	return [supportItem.sundayCode, supportItem.sundayRate.toNumber()];
	// }
	// if (
	// 	moment(activity.date).day() === 6 &&
	// 	supportItem.saturdayCode &&
	// 	supportItem.saturdayRate
	// ) {
	// 	return [supportItem.saturdayCode, supportItem.saturdayRate.toNumber()];
	// }
	// if (
	// 	moment(activity.endTime, "HH:mm").isAfter(moment("20:00", "HH:mm")) &&
	// 	supportItem.weeknightCode &&
	// 	supportItem.weeknightRate
	// ) {
	// 	return [supportItem.weeknightCode, supportItem.weeknightRate.toNumber()];
	// }

	// return [supportItem.weekdayCode, supportItem.weekdayRate.toNumber()];
};

export const getTotalCost = async (invoiceId: string) => {
	let totalCost = invoiceId.length;

	return totalCost;

	// const invoice = await prisma.invoice.findFirst({
	// 	where: {
	// 		id: invoiceId,
	// 	},
	// 	include: {
	// 		activities: {
	// 			include: {
	// 				supportItem: {
	// 					select: {
	// 						rateType: true,
	// 					},
	// 				},
	// 			},
	// 		},
	// 	},
	// });

	// if (!invoice) return 0;

	// invoice.activities.forEach(async (activity) => {
	// 	const { supportItem } = activity;

	// 	const [, rate] = await getRate(activity.id);

	// 	if (rate) {
	// 		if (supportItem.rateType === "HOUR") {
	// 			totalCost += rate * activity.itemDuration;
	// 		} else if (supportItem.rateType === "KM") {
	// 			totalCost += rate * Number(activity.itemDistance);
	// 		}
	// 	}
	// });

	// return totalCost;
};

export const getTotalString = (invoiceId: string) =>
	getTotalCost(invoiceId).then((cost) => `$${cost.toFixed(2)}`);

// export const createTemplateFromInvoice = (invoice: Invoice) => {
// 	invoice.activities.map((activity) => {
// 		activity.date = "";
// 		return activity;
// 	});

// 	const template: Template = {
// 		...invoice,
// 		template_name: invoice.client_name,
// 	};

// 	createTemplate(template);
// 	toast.info("Template saved!");
// };

export const errorIn = (
	errors: FormikErrors<any>,
	touched: FormikTouched<any>,
	value: string
): boolean => getIn(errors, value) !== undefined && getIn(touched, value);
