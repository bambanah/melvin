import React, { FC } from "react";
import { useField, useFormikContext } from "formik";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

import * as Styles from "./DatePicker.styles";
import dayjs from "dayjs";

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
				selected={
					(field.value && dayjs(field.value, "DD/MM/YYYY").toDate()) ||
					new Date()
				}
				onChange={(val) => {
					setFieldValue(field.name, dayjs(val).format("DD/MM/YYYY"));
				}}
				dateFormat={"dd/MM/yyyy"}
			/>
		</Styles.Container>
	);
};

export default DatePickerField;
