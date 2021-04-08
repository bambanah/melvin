import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import { Activity, ActivityObject, Invoice } from "../../types";

const firebaseConfig = {
	apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
	authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
	databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
	projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
	storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// If no firebase app is initialised, initialise the app
if (!firebase.apps.length) {
	firebase.initializeApp(firebaseConfig);
}

const app = firebase.app();
export const auth = firebase.auth();
const firestore = firebase.firestore();

console.log(app.name ? "Firebase connected." : "Firebase not connected...");

export const getCurrentUser = () => {
	return auth.currentUser;
};

export const isAuthenticated = () => {
	return auth.currentUser !== null;
};

export const signIn = async () => {
	try {
		await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

		const provider = new firebase.auth.GoogleAuthProvider();
		return await auth.signInWithPopup(provider);
	} catch (err) {
		console.error(err.message);
	}
};

export const getInvoices = () => {
	return firestore
		.collection("invoices")
		.where("owner", "==", auth.currentUser?.uid)
		.get();
};

export const streamInvoices = (observer: any) => {
	return firestore
		.collection("invoices")
		.where("owner", "==", auth.currentUser?.uid)
		.orderBy("date", "desc")
		.onSnapshot(observer);
};

export const getSingleInvoice = (invoiceId: string) => {
	return firestore.collection("invoice").doc(invoiceId).get();
};

export const createInvoice = (invoice: Invoice) => {
	invoice.date = firebase.firestore.Timestamp.now();

	firestore
		.collection("invoices")
		.add(invoice)
		.then(function () {
			console.log("Document successfully written!");
		})
		.catch(function (error) {
			console.error("Error writing document: ", error);
		});
};

export const deleteInvoice = async (invoice_no: string) => {
	var invoiceQuery = firestore
		.collection("invoices")
		.where("invoice_no", "==", invoice_no);

	await invoiceQuery.get().then((querySnapshot) => {
		querySnapshot.forEach((doc) => {
			doc.ref
				.delete()
				.then(() => {
					console.log("Document successfully deleted!");
				})
				.catch((error) => {
					console.error("Error removing document: ", error);
				});
		});
	});
};

export const getActivities = async () => {
	let activities: ActivityObject = {};

	await firestore
		.collection("activities")
		.get()
		.then((querySnapshot) => {
			querySnapshot.forEach((doc: firebase.firestore.DocumentData) => {
				const activity: Activity = doc.data();
				const id = doc.id;

				activities[id] = activity;
			});
		});

	return activities;
};

export const getNextInvoiceNumber = () => {};

export const checkInvoiceNumberValid = () => {};

export const getLastInvoiceDetails = async () => {
	let lastInvoice = {} as Invoice;

	await firestore
		.collection("invoices")
		.where("owner", "==", auth.currentUser?.uid)
		.orderBy("date", "desc")
		.limit(1)
		.get()
		.then((querySnapshot) => {
			querySnapshot.forEach((doc: firebase.firestore.DocumentData) => {
				lastInvoice = doc.data();
			});
		});

	return lastInvoice;
};
