import classNames from "classnames";
import { HTMLProps, ReactElement } from "react";
import {
	FieldValues,
	Path,
	RegisterOptions,
	UseFormRegister,
} from "react-hook-form";

export type InputProps<T extends FieldValues> = {
	register: UseFormRegister<T>;
	rules?: RegisterOptions;
	name: Path<T>;
	error?: boolean;
	prefix?: string | ReactElement;
	suffix?: string;
} & HTMLProps<HTMLInputElement>;

function Input<T extends FieldValues>({
	register,
	name,
	rules,
	prefix,
	suffix,
	error,
	id,
	className,
	...rest
}: InputProps<T>) {
	return (
		<div
			className={classNames([
				"flex items-center overflow-hidden border bg-bg px-3 text-fg shadow-sm focus-within:border-blue-500",
				error && "border-red-600",
			])}
		>
			<span className="text-sm font-light text-gray-500">{prefix}</span>
			<input
				{...register(name, rules)}
				id={id ?? name}
				{...rest}
				className={classNames([
					"flex-grow border-none bg-bg px-6 py-3 pl-1 text-fg outline-none",
					className,
				])}
			/>
			<span className="text-sm font-light text-gray-500">{suffix}</span>
		</div>
	);
}

export default Input;
