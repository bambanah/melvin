import { useField } from "formik";
import React from "react";
import * as Styles from "./TimeInput.styles";

interface Props {
	name: string;
}

export default function TimePicker({ name }: Props) {
	const [field] = useField(name);

	return <Styles.TimeInput className="input" name={field.name} type="time" />;
}
