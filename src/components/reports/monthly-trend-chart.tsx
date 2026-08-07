import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from "@/components/ui/chart";
import type { MonthTotal } from "@/lib/billing-report";
import { formatCurrency } from "@/lib/utils";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { formatAxisCurrency, reportChartConfig } from "./report-chart";

export function MonthlyTrendChart({ months }: { months: MonthTotal[] }) {
	return (
		<ChartContainer
			config={reportChartConfig}
			className="aspect-[5/3] w-full px-2 py-4 sm:aspect-[3/1]"
		>
			<LineChart data={months} margin={{ left: 4, right: 12, top: 8 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					interval="preserveStartEnd"
					minTickGap={16}
					tickMargin={8}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					width={52}
					tickFormatter={formatAxisCurrency}
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							formatter={(value) => formatCurrency(Number(value))}
						/>
					}
				/>
				<Line
					dataKey="total"
					name="Billed"
					// Straight segments: a smoothed curve invents humps and dips below
					// zero between the sparse months a sole trader actually invoices in.
					type="linear"
					stroke="var(--color-total)"
					strokeWidth={2}
					dot={{ r: 2.5, fill: "var(--color-total)" }}
					activeDot={{ r: 4 }}
					isAnimationActive={false}
				/>
			</LineChart>
		</ChartContainer>
	);
}
