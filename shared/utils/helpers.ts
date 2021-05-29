import firebase from "firebase/app";
import { FormikErrors, FormikTouched, getIn } from "formik";
import moment from "moment";
import { toast } from "react-toastify";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
	faCheck,
	faCopy,
	faEdit,
	faFileDownload,
	faTimes,
	faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { Invoice, InvoiceActivity, Template } from "../types";
import { createTemplate, getActivities } from "./firebase";

export const importIcons = () => {
	library.add(faEdit, faTimes, faCheck, faTrash, faCopy, faFileDownload);
};

export const formatDate = (timestamp: firebase.firestore.Timestamp) => {
	const date = timestamp.toDate();

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

export const getTotalCost = async (invoice: Invoice) => {
	let totalCost = 0;

	const activityDetails = await getActivities();

	invoice.activities.forEach((activity) => {
		const activityId = activity.activity_ref.split("/")[1];

		const activityDetail = activityDetails[activityId];

		let rate;
		if (
			activity.end_time &&
			moment(activity.end_time, "HH:mm").isAfter(moment("20:00", "HH:mm"))
		) {
			rate = activityDetail?.weeknight.rate;
		} else {
			rate = activityDetail?.weekday.rate;
		}

		if (rate) {
			if (activityDetail?.rate_type === "hr") {
				totalCost += rate * activity.duration;
			} else if (activityDetail?.rate_type === "km") {
				totalCost += rate * Number(activity.distance);
			}
		}
	});

	return totalCost;
};

export const getTotalString = (invoice: Invoice) =>
	getTotalCost(invoice).then((cost) => `$${cost.toFixed(2)}`);

export const getRate = async (activity: InvoiceActivity) => {
	let rate;
	let itemCode;

	const activityDetails = await getActivities();
	const activityId = activity.activity_ref.split("/")[1];

	const activityDetail = activityDetails[activityId];

	if (
		moment(activity.date, "DD/MM/YY").isoWeekday() === 6 &&
		activityDetail.saturday.rate !== undefined &&
		activityDetail.saturday.rate !== 0 &&
		activityDetail.saturday.item_code.length > 0
	) {
		// Day is a saturday
		rate = activityDetail.saturday.rate;
		itemCode = activityDetail.saturday.item_code;
	} else if (
		moment(activity.date, "DD/MM/YY").isoWeekday() === 7 &&
		activityDetail.sunday.rate !== undefined &&
		activityDetail.sunday.rate !== 0 &&
		activityDetail.sunday.item_code.length > 0
	) {
		// Day is a sunday
		rate = activityDetail.sunday.rate;
		itemCode = activityDetail.sunday.item_code;
	} else if (
		activity.end_time &&
		activityDetail.weeknight.rate !== undefined &&
		activityDetail.weeknight.rate !== 0 &&
		moment(activity.end_time, "HH:mm").isAfter(moment("20:00", "HH:mm"))
	) {
		// Day is a weekday and it's after 8pm
		rate = activityDetail.weeknight.rate;
		itemCode = activityDetail.weeknight.item_code;
	} else {
		// Weekday before 8pm
		rate = activityDetail.weekday.rate;
		itemCode = activityDetail.weekday.item_code;
	}

	return { rate, itemCode };
};

export const createTemplateFromInvoice = (invoice: Invoice) => {
	invoice.activities.map((activity) => {
		activity.date = "";
		return activity;
	});

	const template: Template = {
		...invoice,
		template_name: invoice.client_name,
	};

	createTemplate(template);
	toast.info("Template saved!");
};

export const errorIn = (
	errors: FormikErrors<any>,
	touched: FormikTouched<any>,
	value: string
) => getIn(errors, value) !== undefined && getIn(touched, value);
