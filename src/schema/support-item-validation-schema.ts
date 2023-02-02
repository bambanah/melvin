import * as yup from "yup";

const itemCodeRegex = /^\d{2}_\d{3}_\d{4}_\d_\d$/;

const SupportItemValidationSchema = yup.object().shape({
	description: yup.string().required("Required"),
	rateType: yup.string().required("Required"),
	weekdayCode: yup
		.string()
		.matches(itemCodeRegex, "Check code format")
		.required("Required"),
	weekdayRate: yup
		.number()
		.typeError("Must be a number")
		.positive("Must be greater than 0")
		.required("Required"),
	weeknightCode: yup.string().matches(itemCodeRegex, "Check code format"),
	weeknightRate: yup.number().typeError("Must be a number"),
	saturdayCode: yup.string().matches(itemCodeRegex, "Check code format"),
	saturdayRate: yup.number().typeError("Must be a number"),
	sundayCode: yup.string().matches(itemCodeRegex, "Check code format"),
	sundayRate: yup.number().typeError("Must be a number"),
});

export default SupportItemValidationSchema;
