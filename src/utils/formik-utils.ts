import { FormValues } from "@components/invoices/invoice-form";
import { InvoiceStatus } from "@prisma/client";
import { InvoiceByIdOutput } from "@server/api/routers/invoice-router";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { FormikErrors, FormikTouched, getIn } from "formik";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export const errorIn = (
	errors: FormikErrors<unknown>,
	touched: FormikTouched<unknown>,
	value: string
): boolean => getIn(errors, value) !== undefined && getIn(touched, value);

export const invoiceToValues = (invoice: InvoiceByIdOutput): FormValues => ({
	id: invoice.id,
	invoiceNo: invoice.invoiceNo,
	clientId: invoice.clientId,
	billTo: invoice.billTo,
	date: dayjs.utc(invoice.date).format("DD/MM/YYYY"),
	activities: invoice.activities.map((activity) => ({
		id: activity.id,
		supportItemId: activity.supportItemId ?? "",
		date: dayjs.utc(activity.date).format("YYYY-MM-DD"),
		itemDistance: activity.itemDistance?.toString() ?? "",
		transitDistance: activity.transitDistance?.toString() ?? "",
		transitDuration: activity.transitDuration?.toString() ?? "",
		startTime: dayjs.utc(activity.startTime).format("HH:mm"),
		endTime: dayjs.utc(activity.endTime).format("HH:mm"),
	})),
});

export const valuesToInvoice = (values: FormValues) => ({
	invoice: {
		id: values.id ?? undefined,
		invoiceNo: values.invoiceNo,
		clientId: values.clientId,
		billTo: values.billTo,
		date: values.date
			? dayjs.utc(values.date, "DD/MM/YYYY").toDate()
			: new Date(),
		status: InvoiceStatus.CREATED,
	},
	activities: values.activities.map((activity) => ({
		id: activity.id,
		date: dayjs.utc(activity.date, "YYYY-MM-DD").toDate(),
		itemDistance: Number(activity.itemDistance) || undefined,
		transitDistance: Number(activity.transitDistance) || undefined,
		transitDuration: Number(activity.transitDuration) || undefined,
		startTime: dayjs.utc(`1970-01-01T${activity.startTime}`).toDate(),
		endTime: dayjs.utc(`1970-01-01T${activity.endTime}`).toDate(),
		supportItemId: activity.supportItemId,
	})),
});
