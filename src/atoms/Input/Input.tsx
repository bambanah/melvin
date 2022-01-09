import React, { HTMLProps, ReactElement } from "react";
import * as Styles from "./styles";

interface InputProps {
	error?: boolean;
	prefix?: string | ReactElement;
	suffix?: string;
}

const Input: React.FC<InputProps & HTMLProps<HTMLInputElement>> = ({
	error,
	prefix,
	suffix,
	...props
}) => {
	return (
		<Styles.Container error={error}>
			<Styles.Prefix>{prefix}</Styles.Prefix>
			<input {...props} />
			<Styles.Prefix>{suffix}</Styles.Prefix>
		</Styles.Container>
	);
};

export default Input;
