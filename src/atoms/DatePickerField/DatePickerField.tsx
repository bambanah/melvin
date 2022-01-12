import React, { FC } from "react";
import { useField, useFormikContext } from "formik";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import * as Styles from "./DatePicker.styles";

interface DatePickerProps {
	name: string;
	error?: boolean;
}

const DatePickerField: FC<DatePickerProps> = ({ name, error }) => {
	const { setFieldValue } = useFormikContext();
	const [field] = useField(name);

	return (
		<Styles.Container error={error}>
			<DatePicker
				{...field}
				name={name}
				selected={(field.value && new Date(field.value)) || new Date()}
				onChange={(val) => {
					setFieldValue(field.name, val);
				}}
				dateFormat="dd/MM/yyyy"
			/>
		</Styles.Container>
	);
};

export default DatePickerField;
