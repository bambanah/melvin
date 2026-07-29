import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The at-a-glance facts card detail pages lead with: a `<dl>` that stacks on
 * phones and splits into three columns from `sm` up.
 */
export function FactGrid({ children }: { children: ReactNode }) {
	return (
		<dl className="bg-card grid grid-cols-1 divide-y overflow-hidden rounded-xl border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
			{children}
		</dl>
	);
}

export function Fact({
	icon: Icon,
	label,
	children
}: {
	icon: LucideIcon;
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1 px-4 py-3">
			<dt className="text-foreground/50 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
				<Icon className="h-3.5 w-3.5" />
				{label}
			</dt>
			<dd className="text-sm font-medium">{children}</dd>
		</div>
	);
}
