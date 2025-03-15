import InfiniteList from "@/components/shared/infinite-list";
import ListFilterRow from "@/components/shared/list-filter-row";
import ListPage from "@/components/shared/list-page";
import { Badge } from "@/components/ui/badge";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import {
	formatDuration,
	getDuration,
	isHoliday as isDateHoliday
} from "@/lib/date-utils";
import { groupBy } from "@/lib/generic-utils";
import { trpc } from "@/lib/trpc";
import { ActivityListOutput } from "@/server/api/routers/activity-router";
import dayjs from "dayjs";
import { Car, CircleDollarSign, Clock, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { assignedFilterMap, assignedFilters } from "./activity-list.constants";

interface Props {
	invoiceId?: string;
	displayCreateButton?: boolean;
	groupByAssignedStatus?: boolean;
}

const groupActivitiesByDate = (
	activities?: ActivityListOutput["activities"]
) =>
	activities
		? groupBy(activities, (activity) => dayjs(activity.date).toString())
		: {};

function ActivityList({
	invoiceId,
	displayCreateButton = true,
	groupByAssignedStatus = true
}: Props) {
	const [assignedFilter, setAssignedFilter] = useState<boolean | undefined>();

	const queryResult = trpc.activity.list.useInfiniteQuery({
		assigned: groupByAssignedStatus ? assignedFilter : undefined,
		invoiceId
	});

	return (
		<ListPage>
			<ListPage.Header
				title="Activities"
				createNewHref={
					displayCreateButton
						? "/dashboard/activities/create?redirectUrl=/dashboard/activities"
						: undefined
				}
			/>

			{groupByAssignedStatus && (
				<ListFilterRow
					items={assignedFilters.map((assigned) => ({
						onClick: () => setAssignedFilter(assignedFilterMap[assigned]),
						active: assignedFilter === assignedFilterMap[assigned],
						children: assigned
					}))}
				/>
			)}

			<InfiniteList queryResult={queryResult} dataKey="activities">
				{(activities) =>
					Object.entries(groupActivitiesByDate(activities)).map(
						([date, groupedActivities]) => (
							<div key={date} className="mb-4 overflow-hidden">
								<div className="flex w-full items-center gap-2 px-4 py-2 text-left">
									{dayjs(date).format("dddd D MMM.")}
									{isDateHoliday(date) && (
										<Badge variant="success">Holiday</Badge>
									)}
								</div>

								<div className="flex flex-col divide-y">
									{groupedActivities.map((activity) => (
										<div
											key={activity.id}
											className="flex w-full flex-col justify-between border-dashed p-4 md:flex-row"
										>
											<div className="flex flex-col gap-2 overflow-hidden">
												<Link href={`/dashboard/activities/${activity.id}`}>
													<p className="truncate text-lg font-semibold">
														{activity.supportItem.description}
													</p>
												</Link>
												{activity.itemDistance ? (
													<div className="flex items-center gap-2 whitespace-nowrap text-foreground/80">
														<Car className="h-4 w-4" />
														{activity.itemDistance}km
													</div>
												) : (
													<div className="flex items-center gap-2 whitespace-nowrap text-foreground/80">
														<Clock className="h-4 w-4" />
														{dayjs
															.utc(activity.startTime)
															.format("HH:mm")} -{" "}
														{dayjs.utc(activity.endTime).format("HH:mm")}
														<span className="hidden md:inline">
															(
															{activity.startTime &&
																activity.endTime &&
																formatDuration(
																	getDuration(
																		activity.startTime,
																		activity.endTime
																	)
																)}
															)
														</span>
													</div>
												)}
											</div>
											<div className="flex flex-col items-start justify-between gap-2 md:items-end">
												{activity.client && (
													<Link
														href={`/dashboard/clients/${activity.client.id}`}
													>
														<div className="flex items-center gap-2 md:flex-row-reverse md:font-semibold">
															<User className="h-4 w-4" />
															<span>{activity.client.name}</span>
														</div>
													</Link>
												)}
												<div className="flex items-center gap-2 text-foreground/80 md:flex-row-reverse">
													<CircleDollarSign className="h-4 w-4" />
													<span>
														{getTotalCostOfActivities([
															activity
														]).toLocaleString(undefined, {
															style: "currency",
															currency: "AUD"
														})}
													</span>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						)
					)
				}
			</InfiniteList>
		</ListPage>
	);
}

export default ActivityList;
