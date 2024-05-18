import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { InvoiceStatus } from "@prisma/client";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground",
				secondary: "border-transparent bg-secondary text-secondary-foreground",
				success: "border-transparent bg-success text-success-foreground",
				destructive:
					"border-transparent bg-destructive text-destructive-foreground",
				outline: "text-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function InvoiceStatusBadge({
	invoiceStatus,
	...props
}: {
	invoiceStatus: InvoiceStatus;
} & BadgeProps) {
	let variant: VariantProps<typeof badgeVariants>["variant"];

	if (invoiceStatus === "PAID") variant = "default";
	else if (invoiceStatus === "SENT") variant = "success";
	else variant = "secondary";

	return (
		<Badge variant={variant} {...props}>
			{invoiceStatus}
		</Badge>
	);
}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, InvoiceStatusBadge, badgeVariants };
