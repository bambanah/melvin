import * as yup from "yup";

const InvoiceValidationSchema = yup.object().shape({
	clientId: yup.string().required("Required"),
	billTo: yup.string().required("Required"),
	invoiceNo: yup.string().required("Required"),
	activities: yup.array().of(
		yup.object().shape({
			supportItemId: yup.string().required("Required"),
			date: yup.string().required("Required"),
			startTime: yup.string().required("Required"),
			endTime: yup.string().required("Required"),
			transitDistance: yup.string(),
			itemDuration: yup.string().required("Required"),
		})
	),
});

export default InvoiceValidationSchema;
