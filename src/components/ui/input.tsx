import * as React from "react";

import { cn } from "@/lib/utils";
import {
	FieldValues,
	Path,
	RegisterOptions,
	UseFormRegister,
} from "react-hook-form";

export interface InputProps<T extends FieldValues>
	extends React.InputHTMLAttributes<HTMLInputElement> {
	register?: UseFormRegister<T>;
	rules?: RegisterOptions<T>;
	name?: Path<T>;
}

function InputInner<T extends FieldValues>(
	{ className, type, register, name, rules, ...props }: InputProps<T>,
	ref: React.ForwardedRef<HTMLInputElement>
) {
	return (
		<input
			type={type}
			{...(register && name ? register(name, rules) : {})}
			className={cn(
				"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}
			ref={ref}
			{...props}
		/>
	);
}

const Input = React.forwardRef(InputInner) as <T extends FieldValues>(
	props: InputProps<T> & { ref?: React.ForwardedRef<HTMLInputElement> }
) => ReturnType<typeof InputInner>;

export { Input };
