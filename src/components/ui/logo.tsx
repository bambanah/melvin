import classNames from "classnames";
import { HTMLAttributes } from "react";

type Variant = "XSMALL" | "SMALL" | "MEDIUM" | "LARGE" | "XLARGE";

const variantStyles: Record<Variant, string> = {
	XSMALL: "text-xl",
	SMALL: "text-3xl",
	MEDIUM: "text-5xl",
	LARGE: "text-6xl",
	XLARGE: "text-8xl",
};

interface Props {
	variant?: Variant;
}

const Logo = ({
	children,
	className,
	variant = "SMALL",
	...rest
}: HTMLAttributes<HTMLHeadingElement> & Props) => {
	return (
		<h1
			className={classNames(
				"text- m-0 font-display text-display",
				variantStyles[variant],
				className
			)}
			{...rest}
		>
			{children}
		</h1>
	);
};

export default Logo;
