import { Field } from "formik";
import React from "react";
import styled from "styled-components";

interface PropInterface {
	formValue: string;
	setFieldValue: Function;
}

const TimeInput = styled(Field)`
	width: 8rem;
`;

export default function TimePicker({
	formValue,
	setFieldValue,
}: PropInterface) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFieldValue(formValue, e.target.value);
	};

	return (
		<>
			<TimeInput
				className="input"
				id={formValue}
				name={formValue}
				onBlur={handleChange}
				type="time"
			/>
		</>
	);
}
