import { Field } from "formik";
import React from "react";
import Error from "../../shared/components/form/Error";

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
		<Error error={error} touched={touched} />
	</div>
);

export default FieldInput;
