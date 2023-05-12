import classNames from "classnames";
import { HTMLProps, ReactElement } from "react";
import {
	FieldValues,
	Path,
	RegisterOptions,
	UseFormRegister,
} from "react-hook-form";

type Props<T extends FieldValues> = {
	register: UseFormRegister<T>;
	rules?: RegisterOptions;
	name: Path<T>;
	error?: boolean;
	prefix?: string | ReactElement;
	suffix?: string;
} & HTMLProps<HTMLInputElement>;

const Checkbox = <T extends FieldValues>({
	name,
	register,
	rules,
	className,
	children,
	...rest
}: Props<T>) => {
	return (
		<label
			className={classNames(["flex gap-2 p-2", className])}
			id={name}
			htmlFor={name}
		>
			<input
				type="checkbox"
				{...register(name, rules)}
				className="w-5 cursor-pointer border bg-white outline-none ring-0"
				{...rest}
			/>
			{children}
		</label>
	);
};

export default Checkbox;
