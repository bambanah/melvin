import * as yup from "yup";

const InvoiceValidationSchema = yup.object().shape({
	client_no: yup
		.string()
		.min(5, "Too short")
		.max(20, "Too long")
		.required("Required"),
	client_name: yup.string().required("Required"),
	bill_to: yup.string().required("Required"),
	invoice_no: yup.string().required("Required"),
	activities: yup.array().of(
		yup.object().shape({
			activity_ref: yup.string().required("Required"),
			date: yup.string().required("Required"),
		})
	),
});

export default InvoiceValidationSchema;
