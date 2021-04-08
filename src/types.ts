import firebase from "firebase/app";

export interface Invoice {
	[index: string]: any;
	owner: string;
	invoice_no: string;
	client_name: string;
	client_no: string;
	bill_to: string;
	date: firebase.firestore.Timestamp;
	activities: {
		activity_ref: string;
		date: string;
		start_time?: string;
		end_time?: string;
		duration: number;
		distance: string;
	}[];
}

export interface Errors {
	invoice_no?: string;
	client_no?: string;
	client_name?: string;
	bill_to?: string;
	activities?: {
		activity_ref?: string;
		date?: string;
		start_time?: string;
		end_time?: string;
		duration?: string;
		distance?: string;
	}[];
}

export interface Activity {
	description: string;
	rate: number;
	rate_type: string;
}

export interface ActivityObject {
	[id: string]: Activity;
}
