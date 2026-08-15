import {
	DetailHeader,
	DetailPage,
	DetailSection
} from "@/components/shared/detail-page";
import { Fact, FactGrid } from "@/components/shared/fact";
import Loading from "@/components/ui/loading";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import type { BillingReport } from "@/lib/billing-report";
import { financialYearLabel } from "@/lib/financial-year";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import {
	FileText,
	Info,
	TrendingDown,
	TrendingUp,
	Users,
	Wallet
} from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback } from "react";
import { FinancialYearChart } from "./financial-year-chart";
import { MonthlyTrendChart } from "./monthly-trend-chart";
import { ShareRow, ShareRows } from "./share-rows";
import { TravelBreakdown } from "./travel-breakdown";

/**
 * The selected Financial Year lives in the URL, following the Invoice list's
 * filter pattern, so a year survives a refresh and can be linked to.
 */
function useSelectedFinancialYear() {
	const router = useRouter();
	const raw =
		typeof router.query.fy === "string" ? Number(router.query.fy) : NaN;
	const financialYear = Number.isInteger(raw) ? raw : undefined;

	const select = useCallback(
		(year: number) => {
			router.replace(
				{ pathname: router.pathname, query: { fy: String(year) } },
				undefined,
				{ shallow: true }
			);
		},
		[router]
	);

	return { financialYear, select };
}

function TotalBilledFact({
	report,
	partial
}: {
	report: BillingReport;
	partial: boolean;
}) {
	const change = report.previousYear;
	const rising = (change?.change ?? 0) >= 0;
	const Trend = rising ? TrendingUp : TrendingDown;

	return (
		<Fact icon={Wallet} label="Total billed">
			<span className="block text-2xl font-semibold tracking-tight tabular-nums">
				{formatCurrency(report.totalBilled)}
			</span>
			{change && (
				<span className="text-foreground/50 flex items-center gap-1 text-xs font-normal">
					<Trend className="h-3.5 w-3.5" />
					{rising ? "+" : "−"}
					{formatCurrency(Math.abs(change.change))}
					{change.changeFraction !== undefined &&
						` (${rising ? "+" : "−"}${Math.abs(
							change.changeFraction * 100
						).toFixed(0)}%)`}{" "}
					vs {change.label}
					{/* A part-finished year is not down on a finished one - say so,
					    or the chart's "to date" hatch is undone by this line. */}
					{partial && " so far"}
				</span>
			)}
		</Fact>
	);
}

function BackfilledCaveat({ count }: { count: number }) {
	return (
		<div className="text-foreground/60 bg-muted/40 flex items-start gap-2 rounded-xl border px-4 py-3 text-xs">
			<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
			<p>
				{count} invoice{count === 1 ? "" : "s"} in this year{" "}
				{count === 1 ? "is" : "are"} billed from a backfilled version -
				reconstructed after the fact rather than frozen at send time. Treat
				these figures as close, not exact.
			</p>
		</div>
	);
}

function EmptyYear({ label }: { label: string }) {
	return (
		<section className="bg-card flex flex-col items-center gap-1 rounded-xl border px-5 py-12 text-center">
			<p className="text-sm font-medium">Nothing billed in {label}</p>
			<p className="text-foreground/50 text-sm">
				Sent and paid invoices dated in this financial year will show up here.
			</p>
		</section>
	);
}

export default function ReportsPage() {
	const { financialYear, select } = useSelectedFinancialYear();
	const { data: report, error } = trpc.report.billing.useQuery({
		financialYear
	});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!report) return <Loading />;

	const selectedLabel = financialYearLabel(report.selectedFinancialYear);
	const selectedIsPartial =
		report.years.find(
			(year) => year.financialYear === report.selectedFinancialYear
		)?.partial ?? false;
	const maxClient = report.clients[0]?.total ?? 0;

	return (
		<DetailPage>
			<Head>
				<title>{`Reports - ${selectedLabel} | Melvin`}</title>
			</Head>

			<DetailHeader
				eyebrow={selectedLabel}
				title="Reports"
				actions={
					<Select
						value={String(report.selectedFinancialYear)}
						onValueChange={(value) => select(Number(value))}
					>
						<SelectTrigger className="h-9 w-36" aria-label="Financial year">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{report.years.map((year) => (
								<SelectItem
									key={year.financialYear}
									value={String(year.financialYear)}
								>
									{financialYearLabel(year.financialYear)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
			>
				<FactGrid>
					<TotalBilledFact report={report} partial={selectedIsPartial} />
					<Fact icon={FileText} label="Invoices">
						{report.invoiceCount}
					</Fact>
					<Fact icon={Users} label="Clients billed">
						{report.clientCount}
					</Fact>
				</FactGrid>
			</DetailHeader>

			<DetailSection
				title="Billed by financial year"
				caption="Sent and paid invoices, by invoice date - pick a year to scope everything below"
			>
				<FinancialYearChart
					years={report.years}
					selectedFinancialYear={report.selectedFinancialYear}
					onSelect={select}
				/>
			</DetailSection>

			{report.backfilledCount > 0 && (
				<BackfilledCaveat count={report.backfilledCount} />
			)}

			{report.invoiceCount === 0 ? (
				<EmptyYear label={selectedLabel} />
			) : (
				<>
					<DetailSection title="Monthly trend" caption="By invoice date">
						<MonthlyTrendChart months={report.months} />
					</DetailSection>

					<DetailSection title="Clients">
						<ShareRows>
							{report.clients.map((client) => (
								<ShareRow
									key={client.clientId}
									label={client.clientName}
									total={client.total}
									share={client.share}
									max={maxClient}
									href={`/dashboard/invoices?client=${client.clientId}`}
								/>
							))}
						</ShareRows>
					</DetailSection>

					<DetailSection title="Support items" caption="Support delivery only">
						<ShareRows>
							{report.supportItems.map((item) => (
								<ShareRow
									key={item.supportItemCode}
									label={item.description}
									sublabel={item.supportItemCode}
									total={item.total}
									share={item.share}
								/>
							))}
						</ShareRows>
					</DetailSection>

					<TravelBreakdown travel={report.travel} />
				</>
			)}
		</DetailPage>
	);
}
