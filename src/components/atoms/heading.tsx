import classNames from "classnames";

type Variant = "XSMALL" | "SMALL" | "MEDIUM" | "LARGE" | "XLARGE";

const variantStyles: Record<Variant, string> = {
	XSMALL: "text-lg",
	SMALL: "text-xl",
	MEDIUM: "text-2xl",
	LARGE: "text-4xl",
	XLARGE: "text-6xl",
};

interface Props {
	children: string;
	variant?: Variant;
	className?: string;
}

const Heading = ({ children, className, variant = "MEDIUM" }: Props) => {
	return (
		<h2
			className={classNames(
				"m-0 break-words font-semibold text-fg",
				variantStyles[variant],
				className
			)}
		>
			{children}
		</h2>
	);
};

export default Heading;
