import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import InfiniteList from "@/components/shared/infinite-list";
import ListFilterRow from "@/components/shared/list-filter-row";
import ListPage from "@/components/shared/list-page";
import {
	faCar,
	faClock,
	faMoneyBillWave,
	faPlus,
	faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ActivityListOutput } from "@/server/api/routers/activity-router";
import { getTotalCostOfActivities } from "@/utils/activity-utils";
import {
	formatDuration,
	getDuration,
	isHoliday as isDateHoliday,
} from "@/utils/date-utils";
import { groupBy } from "@/utils/generic-utils";
import { trpc } from "@/utils/trpc";
import dayjs from "dayjs";
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
	groupByAssignedStatus = true,
}: Props) {
	const [assignedFilter, setAssignedFilter] = useState<boolean | undefined>();

	const queryResult = trpc.activity.list.useInfiniteQuery({
		assigned: groupByAssignedStatus ? assignedFilter : undefined,
		invoiceId,
	});

	return (
		<ListPage>
			<ListPage.Header>
				<h2 className="mr-auto text-2xl font-bold">Activities</h2>

				{displayCreateButton ? (
					<Button
						as={Link}
						href="/dashboard/activities/create"
						variant="primary"
					>
						<FontAwesomeIcon icon={faPlus} />
						<span>Add</span>
					</Button>
				) : undefined}
			</ListPage.Header>

			{groupByAssignedStatus && (
				<ListFilterRow
					items={assignedFilters.map((assigned) => ({
						onClick: () => setAssignedFilter(assignedFilterMap[assigned]),
						active: assignedFilter === assignedFilterMap[assigned],
						children: assigned,
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
									{isDateHoliday(date) && <Badge variant="INFO">Holiday</Badge>}
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
													<div className="flex items-center gap-2 whitespace-nowrap">
														<FontAwesomeIcon
															icon={faCar}
															className="w-4 text-zinc-600"
														/>
														{activity.itemDistance}km
													</div>
												) : (
													<div className="flex items-center gap-2 whitespace-nowrap">
														<FontAwesomeIcon
															icon={faClock}
															className="w-4 text-zinc-600"
														/>
														{dayjs.utc(activity.startTime).format("HH:mm")} -{" "}
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
															<FontAwesomeIcon
																icon={faUser}
																className="w-4 text-zinc-600"
															/>
															<span>{activity.client.name}</span>
														</div>
													</Link>
												)}
												<div className="flex items-center gap-2 md:flex-row-reverse">
													<FontAwesomeIcon
														icon={faMoneyBillWave}
														className="w-4 text-zinc-600"
													/>
													<span>
														{getTotalCostOfActivities([
															activity,
														]).toLocaleString(undefined, {
															style: "currency",
															currency: "AUD",
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
