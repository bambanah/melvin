import type { ReactNode } from "react";

/** A self-contained bordered card section, per the activity-page grammar. */
export function ReportSection({
	title,
	caption,
	children
}: {
	title: string;
	caption?: string;
	children: ReactNode;
}) {
	return (
		<section className="bg-card overflow-hidden rounded-xl border">
			<div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b px-5 py-3.5">
				<h2 className="text-sm font-semibold">{title}</h2>
				{caption && <p className="text-foreground/50 text-xs">{caption}</p>}
			</div>
			{children}
		</section>
	);
}
