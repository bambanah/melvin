import firebase from "firebase/app";
import { FormikErrors, FormikTouched, getIn } from "formik";
import moment from "moment";
// import { toast } from "react-toastify";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
	faCheck,
	faCopy,
	faEdit,
	faFileDownload,
	faTimes,
	faTrash,
} from "@fortawesome/free-solid-svg-icons";
import prisma from "./prisma";

export const importIcons = () => {
	library.add(faEdit, faTimes, faCheck, faTrash, faCopy, faFileDownload);
};

export const formatDate = (date: Date) => {
	const YYYY = date.getFullYear();
	const MM = `0${date.getMonth() + 1}`.slice(-2);
	const DD = `0${date.getDate()}`.slice(-2);

	return `${DD}/${MM}/${YYYY}`;
};

export const stringToTimestamp = (timeValue: string) => {
	const date = moment(timeValue, "HH:mm").toDate();
	const timestamp = firebase.firestore.Timestamp.fromDate(date);

	return timestamp;
};

export const timestampToString = (timeValue: firebase.firestore.Timestamp) => {
	const date = timeValue.toDate();
	const timeString = moment(date).format("HH:mm");

	return timeString;
};

export const getDuration = (startTime: string, endTime: string) => {
	const startMoment = moment(startTime, "HH:mm");
	const endMoment = moment(endTime, "HH:mm");

	const duration = moment.duration(startMoment.diff(endMoment));
	return Math.abs(duration.asHours());
};

export const getPrettyDuration = (hours: number) => {
	const duration = moment.duration(hours, "hours");

	let durationString = "";

	if (duration.hours() > 0)
		durationString += `${duration.hours()} hour${
			duration.hours() === 1 ? "" : "s"
		}`;

	if (duration.minutes() > 0)
		durationString = `${
			durationString.length > 0 ? `${durationString}, ` : ""
		}${duration.minutes()} mins`;

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
	let totalCost = 0;

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
) => getIn(errors, value) !== undefined && getIn(touched, value);
