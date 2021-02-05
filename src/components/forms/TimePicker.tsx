import { Field } from "formik";
import moment from "moment";
import React from "react";

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

	let options = [];
	let timeValue = moment("12:00AM", "HH:mmA");
	let endTime = moment("11:59PM", "HH:mmA");

	while (timeValue.isBefore(endTime)) {
		options.push(
			<option
				key={timeValue.format("HH:mmA")}
				value={timeValue.format("HH:mmA")}
			>
				{timeValue.format("HH:mmA")}
			</option>
		);

		timeValue = timeValue.add(15, "minutes");
	}

	return (
		<div className="control">
			<div className="select">
				<Field id={formValue} as="select" name={formValue} onChange={onChange}>
					{options}
				</Field>
			</div>
		</div>
	);
}
