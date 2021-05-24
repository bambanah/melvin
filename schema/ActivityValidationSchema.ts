import * as yup from "yup";

const itemCodeRegex = /^[0-9]{2}_[0-9]{3}_[0-9]{4}_[0-9]{1}_[0-9]{1}$/;

const ActivityValidationSchema = yup.object().shape({
	description: yup.string().min(5, "Too short").required("Required"),
	rate_type: yup.string().required("Required"),
	weekday: yup.object().shape({
		item_code: yup
			.string()
			.matches(itemCodeRegex, "Check code format")
			.required("Required"),
		rate: yup
			.number()
			.typeError("Must be a number")
			.positive("Must be greater than 0")
			.required("Required"),
	}),
	weeknight: yup.object().shape({
		item_code: yup.string().matches(itemCodeRegex, "Check code format"),
		rate: yup.number().typeError("Must be a number"),
	}),
	saturday: yup.object().shape({
		item_code: yup.string().matches(itemCodeRegex, "Check code format"),
		rate: yup.number().typeError("Must be a number"),
	}),
	sunday: yup.object().shape({
		item_code: yup.string().matches(itemCodeRegex, "Check code format"),
		rate: yup.number().typeError("Must be a number"),
	}),
});

export default ActivityValidationSchema;
