/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable jsx-a11y/label-has-associated-control */
import classNames from "classnames";
import { DetailedHTMLProps, LabelHTMLAttributes } from "react";

const Label = ({
	children,
	className,
	required,
	...rest
}: DetailedHTMLProps<
	LabelHTMLAttributes<HTMLLabelElement>,
	HTMLLabelElement
> & { required?: boolean }) => (
	<label
		className={classNames([
			"flex flex-auto flex-col gap-2",
			required && "[&>span]:after:text-red-600 [&>span]:after:content-['_*']",
			className,
		])}
		{...rest}
	>
		{children}
	</label>
);

export default Label;
