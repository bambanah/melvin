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

export interface Template extends Invoice {
	template_name: string;
}
export interface TemplateObject {
	[id: string]: Template;
}

export interface Activity {
	description: string;
	rate: number;
	rate_type: string;
}

export interface ActivityObject {
	[id: string]: Activity;
}
