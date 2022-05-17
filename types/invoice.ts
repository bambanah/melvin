import { InvoiceStatus } from "@prisma/client";
import { Activity } from "./activity";
import { Client } from "./client";

export default interface Invoice {
	status: InvoiceStatus;
	id: string;
	date: Date;
	billTo: string;
	invoiceNo: string;
	activities: Activity[];
	client?: Client;
}
