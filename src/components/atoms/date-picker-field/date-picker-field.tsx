import { useField, useFormikContext } from "formik";
import { FC } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as Styles from "./styles";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

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
				onChange={(value) => {
					setFieldValue(field.name, dayjs(value).format("DD/MM/YYYY"));
				}}
				dateFormat={"dd/MM/yyyy"}
			/>
		</Styles.Container>
	);
};

export default DatePickerField;
