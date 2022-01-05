import * as yup from "yup";

const InvoiceValidationSchema = yup.object().shape({
	clientId: yup.string().required("Required"),
	billTo: yup.string().required("Required"),
	invoiceNo: yup.string().required("Required"),
});

export default InvoiceValidationSchema;
