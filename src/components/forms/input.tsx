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
				"flex items-center overflow-hidden rounded-md border bg-white pl-3 text-fg shadow-md focus-within:border-indigo-500",
				error && "border-red-600",
				className,
			])}
		>
			<span className="text-sm font-light text-gray-500">{prefix}</span>
			<input
				{...register(name, rules)}
				id={id ?? name}
				{...rest}
				className={classNames([
					"w-full border-none px-1 py-3 text-fg outline-none",
				])}
			/>
			{suffix && (
				<span className="mr-3 text-sm font-light text-gray-500">{suffix}</span>
			)}
		</div>
	);
}

export default Input;
