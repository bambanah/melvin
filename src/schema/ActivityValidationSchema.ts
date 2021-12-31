import * as yup from "yup";

const itemCodeRegex = /^[0-9]{2}_[0-9]{3}_[0-9]{4}_[0-9]{1}_[0-9]{1}$/;

const ActivityValidationSchema = yup.object().shape({
	description: yup.string().min(5, "Too short").required("Required"),
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

export default ActivityValidationSchema;
