import { Field } from "formik";
import React from "react";
import ErrorMessage from "../../shared/components/forms/ErrorMessage";

const FieldInput = ({
	value,
	labelText,
	error,
	touched,
}: {
	value: string;
	labelText?: string;
	error: string | undefined;
	touched: boolean | undefined;
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
		<ErrorMessage error={error} touched={touched} />
	</div>
);

export default FieldInput;
