import firebase from "firebase/app";
import { FormikErrors, FormikTouched, getIn } from "formik";
import moment from "moment";
import { toast } from "react-toastify";
import { Invoice, Template } from "../types";
import { createTemplate, getActivities } from "./firebase";

export const formatDate = (timestamp: firebase.firestore.Timestamp) => {
	const date = timestamp.toDate();

	const YYYY = date.getFullYear();
	const MM = `0${date.getMonth() + 1}`.slice(-2);
	const DD = `0${date.getDate()}`.slice(-2);

	return `${DD}/${MM}/${YYYY}`;
};

export const stringToTimestamp = (timeValue: string) => {
	const date = moment(timeValue, "HH:mmA").toDate();
	const timestamp = firebase.firestore.Timestamp.fromDate(date);

	return timestamp;
};

export const timestampToString = (timeValue: firebase.firestore.Timestamp) => {
	const date = timeValue.toDate();
	const timeString = moment(date).format("HH:mmA");

	return timeString;
};

export const getDuration = (startTime: string, endTime: string) => {
	const startMoment = moment(startTime, "HH:mmA");
	const endMoment = moment(endTime, "HH:mmA");

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

		if (activityDetails[activityId].rate_type === "hr") {
			totalCost += activityDetails[activityId].rate * activity.duration;
		} else if (activityDetails[activityId].rate_type === "km") {
			totalCost +=
				activityDetails[activityId].rate * parseInt(activity.distance, 10);
		} else if (activityDetails[activityId].rate_type === "minutes") {
			totalCost += activityDetails[activityId].rate * (activity.duration / 60);
		}
	});

	return totalCost;
};

export const getTotalString = (invoice: Invoice) =>
	getTotalCost(invoice).then((cost) => `$${cost.toFixed(2)}`);

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
