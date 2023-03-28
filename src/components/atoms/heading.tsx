import classNames from "classnames";

type Variant = "XSMALL" | "SMALL" | "MEDIUM" | "LARGE" | "XLARGE";

const variantStyles: Record<Variant, string> = {
	XSMALL: "text-base md:text-lg",
	SMALL: "text-lg md:text-2xl",
	MEDIUM: "text-xl md:text-3xl",
	LARGE: "text-2xl md:text-4xl",
	XLARGE: "text-4xl md:text-6xl",
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
