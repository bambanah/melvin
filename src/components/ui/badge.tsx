import classNames from "classnames";
import { InvoiceStatus } from "@prisma/client";

type Variant = "DEFAULT" | "INFO" | "SUCCESS" | "WARNING" | "ERROR";

const variantStyles: Record<Variant, string> = {
	DEFAULT: "bg-zinc-200 text-zinc-600",
	INFO: "bg-blue-100 text-blue-500",
	SUCCESS: "bg-green-200 text-green-600",
	WARNING: "bg-yellow-100 text-yellow-600",
	ERROR: "bg-red-100 text-red-600",
};

interface Props {
	children: string;
	variant?: Variant;
}

export const InvoiceStatusBadge = ({
	invoiceStatus,
}: {
	invoiceStatus: InvoiceStatus;
}) => {
	let variant: Variant;

	if (invoiceStatus === "PAID") variant = "SUCCESS";
	else if (invoiceStatus === "SENT") variant = "WARNING";
	else variant = "DEFAULT";

	return <Badge variant={variant}>{invoiceStatus}</Badge>;
};

const Badge = ({ children, variant = "DEFAULT" }: Props) => {
	return (
		<div
			className={classNames(
				"flex h-5 items-center justify-center rounded-[5px] px-2 text-xs font-bold",
				variantStyles[variant]
			)}
		>
			{children}
		</div>
	);
};

export default Badge;
