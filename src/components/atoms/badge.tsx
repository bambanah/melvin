import classNames from "classnames";

type Variant = "DEFAULT" | "INFO" | "SUCCESS" | "WARNING" | "ERROR";

const variantStyles: Record<Variant, string> = {
	DEFAULT: "bg-slate-200 text-slate-600",
	INFO: "bg-blue-100 text-blue-500",
	SUCCESS: "bg-green-200 text-green-600",
	WARNING: "bg-yellow-100 text-yellow-600",
	ERROR: "bg-red-100 text-red-600",
};

interface Props {
	children: string;
	variant?: Variant;
}

const Badge = ({ children, variant = "DEFAULT" }: Props) => {
	return (
		<div
			className={classNames(
				"bg-b rounded-[5px] py-0.5 px-1 text-[11px] font-bold",
				variantStyles[variant]
			)}
		>
			{children}
		</div>
	);
};

export default Badge;
