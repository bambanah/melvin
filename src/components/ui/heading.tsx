import { cn } from "@/lib/utils";

type Size = "xsmall" | "small" | "medium";

const variantStyles: Record<Size, string> = {
	xsmall: "text-base md:text-xl",
	small: "text-lg md:text-2xl",
	medium: "text-xl md:text-3xl"
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
				"text-fg m-0 font-semibold wrap-break-word",
				variantStyles[size],
				className
			)}
		>
			{children}
		</h2>
	);
};

export default Heading;
