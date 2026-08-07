import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import { rampOpacity, REPORT_SERIES_COLOR } from "./report-chart";

const formatShare = (share: number) => `${(share * 100).toFixed(1)}%`;

/**
 * A magnitude bar drawn beside the figure it restates. Length carries the
 * magnitude; the single-hue ramp reinforces it. Colour never encodes identity
 * here - a categorical palette would repaint the surviving rows every time the
 * selected Financial Year changed.
 */
function MagnitudeBar({ value, max }: { value: number; max: number }) {
	return (
		<div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
			<div
				className="h-full rounded-full"
				style={{
					width: `${max > 0 ? Math.max((value / max) * 100, 1) : 0}%`,
					backgroundColor: REPORT_SERIES_COLOR,
					opacity: rampOpacity(value, max)
				}}
			/>
		</div>
	);
}

interface RowProps {
	label: string;
	sublabel?: string;
	total: number;
	share: number;
	max: number;
	href?: string;
}

function RowBody({ label, sublabel, total, share, max }: RowProps) {
	return (
		<>
			<div className="flex items-baseline justify-between gap-4">
				<div className="flex min-w-0 flex-col gap-0.5">
					<p className="truncate text-sm font-medium">{label}</p>
					{sublabel && (
						<p className="text-foreground/40 font-mono text-xs">{sublabel}</p>
					)}
				</div>
				<div className="flex shrink-0 items-baseline gap-2">
					<span className="text-sm font-semibold tabular-nums">
						{formatCurrency(total)}
					</span>
					<span className="text-foreground/50 w-12 text-right text-xs tabular-nums">
						{formatShare(share)}
					</span>
				</div>
			</div>
			<MagnitudeBar value={total} max={max} />
		</>
	);
}

export function BreakdownRow(props: RowProps) {
	const className = "flex flex-col gap-2 px-5 py-3.5";

	return props.href ? (
		<Link
			href={props.href}
			className={`${className} hover:bg-muted/50 transition-colors`}
			title={`${props.label} - ${formatCurrency(props.total)}`}
		>
			<RowBody {...props} />
		</Link>
	) : (
		<div
			className={className}
			title={`${props.label} - ${formatCurrency(props.total)}`}
		>
			<RowBody {...props} />
		</div>
	);
}

export function BreakdownList({ children }: { children: ReactNode }) {
	return <div className="divide-y">{children}</div>;
}
