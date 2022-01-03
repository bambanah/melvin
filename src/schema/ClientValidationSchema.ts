import * as yup from "yup";

const ClientValidationSchema = yup.object().shape({
	firstName: yup.string().required("Required"),
	lastName: yup.string().required("Required"),
	number: yup.number().typeError("Must be a number").required("Required"),
});

export default ClientValidationSchema;
