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
	rules?: RegisterOptions;
	name?: Path<T>;
	error?: boolean;
	suffix?: string;
}

function InputInner<T extends FieldValues>(
	{ className, type, ...props }: InputProps<T>,
	ref: React.ForwardedRef<HTMLInputElement>
) {
	return (
		<input
			type={type}
			className={cn(
				"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}
			ref={ref}
			prefix="asfd"
			{...props}
		/>
	);
}

const Input = React.forwardRef(InputInner) as <T extends FieldValues>(
	props: InputProps<T> & { ref?: React.ForwardedRef<HTMLInputElement> }
) => ReturnType<typeof InputInner>;

export { Input };
