import * as yup from "yup";

const ActivityValidationSchema = yup.object().shape({
	supportItemId: yup.string().required("Required"),
	date: yup.string().required("Required"),
	startTime: yup.string().required("Required"),
	endTime: yup.string().required("Required"),
	itemDistance: yup.string(),
	transitDistance: yup.string(),
	transitDuration: yup.string(),
});

export default ActivityValidationSchema;
