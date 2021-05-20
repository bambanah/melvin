import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import { toast } from "react-toastify";
import {
	Activity,
	ActivityObject,
	Invoice,
	Template,
	TemplateObject,
} from "../types";

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// If no firebase app is initialised, initialise the app
if (!firebase.apps.length) {
	firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
const firestore = firebase.firestore();

//
// --- Auth ---
//

export const getCurrentUser = () => auth.currentUser;

export const isAuthenticated = () => auth.currentUser !== null;

export const signIn = async () => {
	try {
		await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

		const provider = new firebase.auth.GoogleAuthProvider();
		return await auth.signInWithPopup(provider);
	} catch (err) {
		console.error(err.message);
		return null;
	}
};

export const signOut = async () => {
	try {
		await auth.signOut();
	} catch (err) {
		console.error(err.message);
	}
};

//
// --- Invoices ---
//

export const getInvoices = () =>
	firestore
		.collection("invoices")
		.where("owner", "==", auth.currentUser?.uid)
		.get();

export const streamInvoices = (observer: any) =>
	firestore
		.collection("invoices")
		.where("owner", "==", auth.currentUser?.uid)
		.orderBy("date", "desc")
		.onSnapshot(observer);

export const getSingleInvoice = (invoiceId: string) =>
	firestore.collection("invoice").doc(invoiceId).get();

export const createInvoice = (invoice: Invoice) => {
	invoice.date = firebase.firestore.Timestamp.now();

	firestore
		.collection("invoices")
		.add(invoice)
		.then(() => {
			toast.success("Invoice created");
		})
		.catch((error) => {
			console.error("Error writing document: ", error);
		});
};

export const deleteInvoice = async (invoice_no: string) => {
	const invoiceQuery = firestore
		.collection("invoices")
		.where("invoice_no", "==", invoice_no)
		.where("owner", "==", getCurrentUser()?.uid);

	await invoiceQuery.get().then((querySnapshot) => {
		querySnapshot.forEach((doc) => {
			doc.ref
				.delete()
				.then(() => toast.error("Invoice deleted"))
				.catch((error) => {
					console.error("Error removing document: ", error);
				});
		});
	});
};

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

//
// --- Templates ---
//

export const createTemplate = (template: Template) => {
	template.date = firebase.firestore.Timestamp.now();

	firestore
		.collection("templates")
		.add(template)
		.catch((error) => {
			console.error("Error writing document: ", error);
		});
};

export const getTemplates = async () => {
	const templates: TemplateObject = {};

	await firestore
		.collection("templates")
		.get()
		.then((querySnapshot) => {
			querySnapshot.forEach((doc: firebase.firestore.DocumentData) => {
				const template: Template = doc.data();
				const { id } = doc;

				templates[id] = template;
			});
		});

	return templates;
};

//
// --- Activities ---
//

export const createActivity = (activity: Activity) => {
	activity.owner = auth.currentUser?.uid;

	firestore
		.collection("activities")
		.add({ ...activity })
		.then(() => {
			toast.success("Activity created");
		})
		.catch((error) => {
			console.error("Error writing document: ", error);
			toast.error("Couldn't save activity - try again later");
		});
};

export const streamActivities = (observer: any) =>
	firestore
		.collection("activities")
		.where("owner", "==", auth.currentUser?.uid)
		.orderBy("description", "desc")
		.onSnapshot(observer);

export const getActivities = async () => {
	const activities: ActivityObject = {};

	await firestore
		.collection("activities")
		.get()
		.then((querySnapshot) => {
			querySnapshot.forEach((doc: firebase.firestore.DocumentData) => {
				const activity: Activity = doc.data();
				const { id } = doc;

				activities[id] = activity;
			});
		});

	return activities;
};
