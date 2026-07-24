import InfiniteList from "@/components/shared/infinite-list";
import { useRateContext } from "@/components/shared/use-rate-context";
import { Badge } from "@/components/ui/badge";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { formatActivityDuration, isHoliday, utcDate } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc";
import type { TransitRateContext } from "@/lib/billing-lines";
import type { ActivityUnbilledListOutput } from "@/server/api/routers/activity-router";
import { format, parse } from "date-fns";
import { Car, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import ActivitySubLines from "./activity-sub-lines";

type UnbilledActivities = ActivityUnbilledListOutput["activities"];
type UnbilledActivity = UnbilledActivities[number];

const currency = (value: number) =>
	value.toLocaleString(undefined, {
		style: "currency",
		currency: "AUD",
		minimumFractionDigits: 0
	});

function groupByDate(activities: UnbilledActivities) {
	const groups: { date: string; activities: UnbilledActivities }[] = [];
	const map = new Map<string, UnbilledActivities>();

	for (const activity of activities) {
		const key = format(new Date(activity.date), "yyyy-MM-dd");
		const existing = map.get(key);
		if (existing) {
			existing.push(activity);
		} else {
			const group: UnbilledActivities = [activity];
			map.set(key, group);
			groups.push({ date: key, activities: group });
		}
	}

	return groups;
}

const CalendarAgenda = () => {
	const rateContext = useRateContext();

	const queryResult = trpc.activity.unbilledList.useInfiniteQuery(
		{},
		{ getNextPageParam: (lastPage) => lastPage.nextCursor }
	);
	const { data: summary } = trpc.activity.unbilledSummary.useQuery();

	const isEmpty =
		queryResult.isSuccess &&
		queryResult.data.pages.every((page) => page.activities.length === 0);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-2">
				<h2 className="text-base font-semibold">Unbilled</h2>
				{summary && !isEmpty && (
					<span className="text-muted-foreground text-sm">
						{`${summary.count} ${
							summary.count === 1 ? "activity" : "activities"
						} · ${currency(summary.total)}`}
					</span>
				)}
			</div>

			{isEmpty ? (
				<EmptyState />
			) : (
				<InfiniteList queryResult={queryResult} dataKey="activities">
					{(activities) =>
						groupByDate(activities).map(
							({ date, activities: dayActivities }) => {
								const day = parse(date, "yyyy-MM-dd", new Date());
								const holiday = isHoliday(day);
								const dayCost = getTotalCostOfActivities(
									dayActivities,
									rateContext,
									{ forDisplay: true }
								);

								return (
									<div key={date} className="py-3">
										<div className="flex items-center justify-between px-2 pb-2">
											<div className="flex items-center gap-2">
												<span className="text-sm font-semibold">
													{format(day, "EEE d MMM yyyy")}
												</span>
												{holiday && <Badge variant="success">Holiday</Badge>}
											</div>
											<span className="text-muted-foreground text-xs">
												{currency(dayCost)}
											</span>
										</div>

										<div className="flex flex-col">
											{dayActivities.map((activity) => (
												<AgendaRow
													key={activity.id}
													activity={activity}
													rateContext={rateContext}
												/>
											))}
										</div>
									</div>
								);
							}
						)
					}
				</InfiniteList>
			)}
		</div>
	);
};

interface AgendaRowProps {
	activity: UnbilledActivity;
	rateContext?: TransitRateContext;
}

const AgendaRow = ({ activity, rateContext }: AgendaRowProps) => {
	// Every row here is unbilled, so an attached invoice is always a draft.
	const draftInvoiceNo =
		activity.invoiceId && activity.invoice ? activity.invoice.invoiceNo : null;
	const cost = getTotalCostOfActivities([activity], rateContext, {
		forDisplay: true
	});

	return (
		<Link
			href={`/dashboard/activities/${activity.id}`}
			className="hover:bg-muted/50 flex items-start justify-between gap-4 rounded-md px-2 py-2.5 transition-colors"
		>
			<div className="flex min-w-0 flex-col gap-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className="truncate text-sm font-medium">
						{activity.supportItem.description}
					</p>
					{draftInvoiceNo && (
						<Badge variant="outline" className="text-xs">
							Draft INV-{draftInvoiceNo}
						</Badge>
					)}
				</div>

				<div className="text-muted-foreground flex items-center gap-3 text-xs">
					{activity.client && <span>{activity.client.name}</span>}

					{activity.itemDistance ? (
						<span className="flex items-center gap-1">
							<Car className="h-3 w-3" />
							{activity.itemDistance}km
						</span>
					) : activity.startTime && activity.endTime ? (
						<span className="flex items-center gap-1">
							<Clock className="h-3 w-3" />
							{format(utcDate(activity.startTime), "H:mm")} -{" "}
							{format(utcDate(activity.endTime), "H:mm")} (
							{formatActivityDuration(activity.startTime, activity.endTime)})
						</span>
					) : null}
				</div>

				<ActivitySubLines activity={activity} rateContext={rateContext} />
			</div>

			<span className="text-sm font-medium whitespace-nowrap">
				{currency(cost)}
			</span>
		</Link>
	);
};

const EmptyState = () => (
	<div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center">
		<CheckCircle2 className="text-success h-8 w-8" />
		<p className="text-sm font-medium">You&#39;re all caught up</p>
		<p className="text-xs">Every activity has been billed.</p>
	</div>
);

export default CalendarAgenda;
