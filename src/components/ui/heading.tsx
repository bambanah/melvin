import { cn } from "@/lib/utils";

type Size = "xsmall" | "small" | "medium" | "large" | "xlarge";

const variantStyles: Record<Size, string> = {
	xsmall: "text-base md:text-xl",
	small: "text-lg md:text-2xl",
	medium: "text-xl md:text-3xl",
	large: "text-2xl md:text-4xl",
	xlarge: "text-4xl md:text-6xl"
};

interface Props {
	children: string;
	size?: Size;
	className?: string;
}

const Heading = ({ children, className, size = "medium" }: Props) => {
	return (
		<h2
			className={cn(
				"text-fg m-0 break-words font-semibold",
				variantStyles[size],
				className
			)}
		>
			{children}
		</h2>
	);
};

export default Heading;
