import firebase from "firebase";

export const formatDate = (timestamp: firebase.firestore.Timestamp) => {
	const date = timestamp.toDate();

	const YYYY = date.getFullYear();
	const MM = ("0" + (date.getMonth() + 1)).slice(-2);
	const DD = ("0" + date.getDate()).slice(-2);

	return `${DD}-${MM}-${YYYY}`;
};
