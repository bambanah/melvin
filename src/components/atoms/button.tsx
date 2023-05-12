import classNames from "classnames";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "success" | "danger" | "default";

const variantStyles: Record<Variant, string> = {
	primary:
		"bg-blue_pastel text-fg border-none font-semibold disabled:bg-blue-200 disabled:text-gray-400",
	secondary:
		"bg-fg text-bg font-semibold disabled:bg-gray-200 disabled:text-gray-400",
	success:
		"bg-green_pastel font-semibold disabled:bg-green-50 disabled:text-gray-400",
	danger:
		"bg-red-500 font-semibold disabled:bg-gray-200 disabled:text-gray-400",
	default: "bg-bg text-fg disabled:bg-gray-200 disabled:text-gray-400",
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
				"flex cursor-pointer items-center justify-center gap-2 border border-fg px-4 py-2 transition-all duration-100",
				"hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[0.25rem_0.25rem_#000]",
				"disabled:cursor-default disabled:border-gray-400 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none",
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
