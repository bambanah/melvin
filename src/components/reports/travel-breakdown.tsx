import type { BillingReport } from "@/lib/billing-report";
import { formatCurrency } from "@/lib/utils";
import { DetailSection } from "@/components/shared/detail-page";

export function TravelBreakdown({
	travel
}: {
	travel: BillingReport["travel"];
}) {
	return (
		<DetailSection
			title="Travel and transport"
			caption="Excluded from the support items above"
		>
			<div className="divide-y">
				{travel.rows.map((row) => (
					<div
						key={row.kind}
						className="flex items-baseline justify-between gap-4 px-5 py-3"
					>
						<p className="text-sm">{row.label}</p>
						<p className="text-sm font-medium tabular-nums">
							{formatCurrency(row.total)}
						</p>
					</div>
				))}
			</div>

			<div className="bg-muted/40 flex items-baseline justify-between gap-4 border-t px-5 py-4">
				<div className="flex flex-col gap-0.5">
					<p className="text-foreground/70 text-sm font-medium">Subtotal</p>
					<p className="text-foreground/50 text-xs">
						{(travel.shareOfTotal * 100).toFixed(1)}% of total billed
					</p>
				</div>
				<p className="text-lg font-semibold tracking-tight tabular-nums">
					{formatCurrency(travel.subtotal)}
				</p>
			</div>
		</DetailSection>
	);
}
