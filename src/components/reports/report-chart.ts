import type { ChartConfig } from "@/components/ui/chart";

/**
 * The one series every chart on this page draws. `--report-series` already
 * resolves per theme, and unlike the `--color-total` this config produces it
 * is also readable outside a `ChartContainer` - the magnitude bars beside the
 * breakdown tables are plain divs.
 *
 * No chart on this page colours by category, so there is nothing for a
 * colour-vision deficiency to conflate: the year bars are one series, the
 * trend is one line, and the Client bars ramp by magnitude with the figure
 * printed alongside.
 */
export const REPORT_SERIES_COLOR = "var(--report-series)";

export const reportChartConfig = {
	total: { label: "Billed", color: REPORT_SERIES_COLOR }
} satisfies ChartConfig;

/**
 * The faintest a magnitude ramp may go and still clear 3:1 against the card
 * in both themes.
 */
const MIN_RAMP_OPACITY = 0.7;

export const rampOpacity = (value: number, max: number) =>
	max <= 0
		? MIN_RAMP_OPACITY
		: MIN_RAMP_OPACITY + (1 - MIN_RAMP_OPACITY) * (value / max);

/** Axis ticks: whole dollars, thousands abbreviated. */
export const formatAxisCurrency = (value: number) =>
	Math.abs(value) >= 1000
		? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
		: `$${Math.round(value)}`;
