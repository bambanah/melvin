import classNames from "classnames";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "success" | "danger" | "default";

const variantStyles: Record<Variant, string> = {
	primary: "bg-blue_pastel text-fg border-none font-semibold",
	secondary: "bg-fg text-bg font-semibold",
	success: "bg-green-pastel font-semibold",
	danger: "bg-red-500 font-semibold",
	default: "bg-bg text-fg",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
}

const Button = ({
	children,
	className,
	variant = "default",
	type = "button",
	...rest
}: Props) => {
	return (
		<button
			className={classNames([
				"flex cursor-pointer items-center gap-2 border border-fg py-2 px-4 transition-all duration-100 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[0.25rem_0.25rem_#000]",
				variantStyles[variant],
				className,
			])}
			type={type}
			{...rest}
		>
			{children}
		</button>
	);
};

export default Button;
