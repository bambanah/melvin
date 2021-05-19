import { Field } from "formik";
import moment from "moment";
import React from "react";
import Control from "../form/Control";

interface PropInterface {
	formValue: string;
	setFieldValue: Function;
}

export default function TimePicker({
	formValue,
	setFieldValue,
}: PropInterface) {
	const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFieldValue(formValue, e.target.value);
	};

	const timeFormat = "h:mmA";

	const options = [];
	let timeValue = moment("12:00AM", timeFormat);
	const endTime = moment("11:59PM", timeFormat);

	while (timeValue.isBefore(endTime)) {
		options.push(
			<option
				key={timeValue.format(timeFormat)}
				value={timeValue.format(timeFormat)}
			>
				{timeValue.format(timeFormat)}
			</option>,
		);

		timeValue = timeValue.add(5, "minutes");
	}

	return (
		<Control className="control">
			<div className="select">
				<Field id={formValue} as="select" name={formValue} onChange={onChange}>
					{options}
				</Field>
			</div>
		</Control>
	);
}
