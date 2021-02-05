import firebase from "firebase/app";

export interface Invoice {
	[index: string]: any;
	client_name: string;
	client_no: string;
	bill_to: string;
	date: firebase.firestore.Timestamp;
	activities: {
		activity_ref: string;
		start_time: string;
		end_time: string;
		duration: number;
	}[];
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
