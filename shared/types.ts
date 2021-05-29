// eslint-disable-next-line import/no-extraneous-dependencies
import firebase from "firebase/app";

export interface Invoice {
	[index: string]: any;
	owner: string;
	invoice_no: string;
	client_name: string;
	client_no: string;
	bill_to: string;
	date: firebase.firestore.Timestamp;
	activities: InvoiceActivity[];
}

export interface InvoiceObject {
	[id: string]: Invoice;
}

export interface InvoiceActivity {
	activity_ref: string;
	date: string;
	start_time?: string;
	end_time?: string;
	duration: number;
	distance: string;
	travel_duration: number;
	travel_distance: number;
}

export interface Template extends Invoice {
	template_name: string;
}
export interface TemplateObject {
	[id: string]: Template;
}

export interface Activity {
	owner?: string;
	description: string;
	rate_type: string;
	weekday: {
		item_code: string;
		rate: number;
	};
	weeknight: {
		item_code: string;
		rate?: number;
	};
	saturday: {
		item_code: string;
		rate?: number;
	};
	sunday: {
		item_code: string;
		rate?: number;
	};
}

export interface ActivityObject {
	[id: string]: Activity;
}
