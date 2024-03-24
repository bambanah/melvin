import classNames from "classnames";
import { HTMLProps } from "react";

interface Props extends HTMLProps<HTMLFormElement> {
	className?: string;
	flex?: "row" | "col";
}

const Form = ({ className, flex = "col", children, ...rest }: Props) => (
	<form
		className={className ?? classNames([`flex gap-4 flex-${flex} w-full`])}
		{...rest}
	>
		{children}
	</form>
);

export default Form;
