import firebase from "firebase";

export interface Invoice {
	[index: string]: any;
	client_name: string;
	client_no: string;
	bill_to: string;
	date: firebase.firestore.Timestamp;
	activity_ref: string[];
	activity_duration: string[];
	invoice_no: string;
}

export interface Activity {
	description: string;
	rate: number;
	rate_type: string;
}

export interface ActivityObject {
	[id: string]: Activity;
}
