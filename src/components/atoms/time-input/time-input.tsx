import { useField } from "formik";
import React from "react";
import * as Styles from "./styles";

interface Props {
	name: string;
	error?: boolean;
}

export default function TimePicker({ name, error }: Props) {
	const [field] = useField(name);

	return (
		<Styles.TimeInput
			className={`input`}
			error={error}
			name={field.name}
			type="time"
		/>
	);
}
