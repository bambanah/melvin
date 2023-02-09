import { HTMLProps, ReactElement } from "react";
import {
	FieldValues,
	Path,
	RegisterOptions,
	UseFormRegister,
} from "react-hook-form";
import * as Styles from "./input.styles";

type InputProps<T extends FieldValues> = {
	register: UseFormRegister<T>;
	rules?: RegisterOptions;
	name: Path<T>;
	error?: boolean;
	prefix?: string | ReactElement;
	suffix?: string;
} & HTMLProps<HTMLInputElement>;

function Input<T extends Record<string, unknown>>({
	register,
	name,
	rules,
	prefix,
	suffix,
	error,
	id,
	...rest
}: InputProps<T>) {
	return (
		<Styles.Container error={error}>
			<Styles.Prefix>{prefix}</Styles.Prefix>
			<input {...register(name, rules)} id={id ?? name} {...rest} />
			<Styles.Prefix>{suffix}</Styles.Prefix>
		</Styles.Container>
	);
}

export default Input;
