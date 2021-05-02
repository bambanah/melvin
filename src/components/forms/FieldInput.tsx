import { Field } from "formik";
import React from "react";

const FieldInput = ({
	value,
	labelText,
	error,
	touched,
}: {
	value: string;
	labelText?: string;
	error?: string;
	touched?: boolean;
}) => (
		<div className="field">
			<label className="label" htmlFor={value}>
				{labelText || value}
			</label>
			<Field
				className={`input ${touched && error && "is-danger"}`}
				id={value}
				name={value}
				placeholder={labelText || value}
			/>
		</div>
	);

export default FieldInput;
