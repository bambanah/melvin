import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from "@/components/ui/chart";
import type { FinancialYearTotal } from "@/lib/billing-report";
import { formatCurrency } from "@/lib/utils";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { formatAxisCurrency, reportChartConfig } from "./report-chart";

const PARTIAL_PATTERN_ID = "report-partial-year";

interface Props {
	years: FinancialYearTotal[];
	selectedFinancialYear: number;
	onSelect: (financialYear: number) => void;
}

/**
 * The bar chart that doubles as the Financial Year selector. The year still in
 * progress is drawn with a hatch rather than a lighter tint, so "incomplete"
 * survives colour-blind and printed viewing.
 */
export function FinancialYearChart({
	years,
	selectedFinancialYear,
	onSelect
}: Props) {
	const data = years.map((year) => ({
		...year,
		axisLabel: year.partial ? `${year.label} (to date)` : year.label
	}));

	return (
		<ChartContainer
			config={reportChartConfig}
			className="aspect-[5/2] w-full px-2 py-4 sm:aspect-[3/1]"
		>
			<BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
				<defs>
					<pattern
						id={PARTIAL_PATTERN_ID}
						patternUnits="userSpaceOnUse"
						width={6}
						height={6}
						patternTransform="rotate(45)"
					>
						<rect width={6} height={6} fill="var(--card)" />
						<rect width={3} height={6} fill="var(--color-total)" />
					</pattern>
				</defs>

				<XAxis
					dataKey="axisLabel"
					tickLine={false}
					axisLine={false}
					interval={0}
					tickMargin={8}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					width={52}
					tickFormatter={formatAxisCurrency}
				/>
				<ChartTooltip
					cursor={false}
					content={
						<ChartTooltipContent
							formatter={(value) => formatCurrency(Number(value))}
						/>
					}
				/>

				<Bar
					dataKey="total"
					name="Billed"
					radius={4}
					// A year with nothing billed still needs a bar to click and to
					// carry the selection outline - the chart is the only selector.
					minPointSize={3}
					isAnimationActive={false}
					className="cursor-pointer"
					onClick={(bar) => {
						const { financialYear } = bar.payload as FinancialYearTotal;
						onSelect(financialYear);
					}}
				>
					{data.map((year) => (
						<Cell
							key={year.financialYear}
							fill={
								year.partial
									? `url(#${PARTIAL_PATTERN_ID})`
									: "var(--color-total)"
							}
							stroke="var(--color-total)"
							strokeWidth={year.financialYear === selectedFinancialYear ? 2 : 0}
							fillOpacity={
								year.financialYear === selectedFinancialYear ? 1 : 0.75
							}
						/>
					))}
				</Bar>
			</BarChart>
		</ChartContainer>
	);
}
