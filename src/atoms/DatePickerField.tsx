import React, { FC } from "react";
import { useField, useFormikContext } from "formik";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DatePickerProps {
	name: string;
}

const DatePickerField: FC<DatePickerProps> = ({ ...props }) => {
	const { setFieldValue } = useFormikContext();
	const [field] = useField(props);

	return (
		<DatePicker
			{...field}
			{...props}
			selected={(field.value && new Date(field.value)) || new Date()}
			onChange={(val) => {
				setFieldValue(field.name, val);
			}}
		/>
	);
};

export default DatePickerField;
