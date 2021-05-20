import * as yup from "yup";

const ActivityValidationSchema = yup.object().shape({
	description: yup.string().min(5, "Too short").required("Required"),
	rate_type: yup.string().required("Required"),
	weekday: yup.object().shape({
		item_code: yup
			.string()
			.matches(
				/^[0-9]{2}_[0-9]{3}_[0-9]{4}_[0-9]{1}_[0-9]{1}$/,
				"Check code format"
			)
			.required("Required"),
		rate: yup.string().required("Required"),
	}),
	weeknight: yup.object().shape({
		item_code: yup
			.string()
			.matches(
				/^[0-9]{2}_[0-9]{3}_[0-9]{4}_[0-9]{1}_[0-9]{1}$/,
				"Check code format"
			),
		rate: yup.number(),
	}),
	saturday: yup.object().shape({
		item_code: yup
			.string()
			.matches(
				/^[0-9]{2}_[0-9]{3}_[0-9]{4}_[0-9]{1}_[0-9]{1}$/,
				"Check code format"
			),
		rate: yup.number(),
	}),
	sunday: yup.object().shape({
		item_code: yup
			.string()
			.matches(
				/^[0-9]{2}_[0-9]{3}_[0-9]{4}_[0-9]{1}_[0-9]{1}$/,
				"Check code format"
			),
		rate: yup.number(),
	}),
});

export default ActivityValidationSchema;
