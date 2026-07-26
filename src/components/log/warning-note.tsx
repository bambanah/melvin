import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The Log's one warning voice. Every capture surface warns rather than blocks -
 * a mistyped travel time, a Session left open past its day, a day that can't
 * promote yet - so they all read the same way.
 */
export function WarningNote({
	className,
	children
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<p
			className={cn(
				"flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500",
				className
			)}
		>
			<TriangleAlert className="mt-0.5 size-4 shrink-0" />
			<span>{children}</span>
		</p>
	);
}
