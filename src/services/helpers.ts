import firebase from "firebase/app";
import moment from "moment";

export const formatDate = (timestamp: firebase.firestore.Timestamp) => {
	const date = timestamp.toDate();

	const YYYY = date.getFullYear();
	const MM = ("0" + (date.getMonth() + 1)).slice(-2);
	const DD = ("0" + date.getDate()).slice(-2);

	return `${DD}-${MM}-${YYYY}`;
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
