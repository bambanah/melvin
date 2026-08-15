import type { ReactNode } from "react";

/** The detail grammar's column. The wider phone padding clears the quick-add FAB. */
export function DetailPage({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-col items-center px-4 pb-24 md:pb-8">
			<div className="flex w-full max-w-3xl flex-col gap-6">{children}</div>
		</div>
	);
}

/** A self-contained bordered card section, the substance below the header. */
export function DetailSection({
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

/**
 * A detail page's header: what this is on the left, what you can do to it on
 * the right, and the at-a-glance facts underneath as `children`.
 */
export function DetailHeader({
	eyebrow,
	title,
	badge,
	subline,
	actions,
	children
}: {
	eyebrow?: ReactNode;
	title: ReactNode;
	badge?: ReactNode;
	subline?: ReactNode;
	actions?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<header className="mt-2 flex flex-col gap-5">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-1">
					{eyebrow && (
						<p className="text-primary text-xs font-medium">{eyebrow}</p>
					)}
					<div className="flex items-center gap-2.5">
						<h1 className="text-lg font-semibold tracking-tight text-balance md:text-xl">
							{title}
						</h1>
						{badge}
					</div>
					{subline && (
						<p className="text-foreground/50 font-mono text-xs">{subline}</p>
					)}
				</div>

				{actions && (
					<div className="flex shrink-0 items-center gap-1.5">{actions}</div>
				)}
			</div>

			{children}
		</header>
	);
}
