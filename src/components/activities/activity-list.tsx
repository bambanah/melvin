import Badge from "@atoms/badge";
import Loading from "@atoms/loading";
import ListPage from "@components/shared/list-page";
import { ActivityFetchAllOutput } from "@server/routers/activity-router";
import { getTotalCost, groupBy, isHoliday } from "@utils/helpers";
import { trpc } from "@utils/trpc";
import classNames from "classnames";
import dayjs from "dayjs";
import { useState } from "react";

interface Props {
	invoiceId?: string;
	groupByAssignedStatus?: boolean;
}

function ActivityList({ invoiceId, groupByAssignedStatus = true }: Props) {
	const [assignedFilter, setAssignedFilter] = useState<boolean>(false);

	const { data: { activities } = {}, error } = trpc.activity.list.useQuery({
		assigned: groupByAssignedStatus ? assignedFilter : undefined,
		invoiceId,
	});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	const groupedActivities: { [key: string]: ActivityFetchAllOutput[] } =
		activities
			? groupBy(activities, (activity) => dayjs(activity.date).toString())
			: {};

	return (
		<ListPage title="Activities" createHref="/activities/create">
			{groupByAssignedStatus && (
				<div className="mb-4 flex w-full">
					{[false, true].map((status, idx) => (
						<button
							key={idx}
							type="button"
							onClick={() => setAssignedFilter(status)}
							className={classNames([
								"basis-1/2 border-b-[3px] px-4 py-2 text-center transition-all",
								assignedFilter === status &&
									"border-indigo-700 text-indigo-700",
							])}
						>
							{status ? "ASSIGNED" : "UNASSIGNED"}
						</button>
					))}
				</div>
			)}

			{Object.keys(groupedActivities).length > 0 ? (
				Object.keys(groupedActivities).map((group) => (
					<div key={group} className="mb-4 overflow-hidden">
						<div className="flex w-full items-center gap-2 border-b bg-neutral-50 px-4 py-2 text-left">
							{dayjs(group).format("dddd DD MMM.")}
							{isHoliday(group) && <Badge variant="INFO">Holiday</Badge>}
						</div>

						<ListPage.Items>
							{groupedActivities[group].map((activity) => (
								<ListPage.Item
									href={`/activities/${activity.id}`}
									key={activity.id}
								>
									<div className="flex flex-col gap-2 overflow-hidden">
										<span className="font-semibold">
											{activity.client?.name}
										</span>
										<p className="truncate">
											{activity.supportItem.description}
										</p>
									</div>
									<div className="flex flex-col items-end justify-between gap-2">
										<p className="whitespace-nowrap">
											{dayjs(activity.startTime).format("HH:mm")}-
											{dayjs(activity.endTime).format("HH:mm")}
										</p>
										<span className="font-semibold">
											{getTotalCost([activity]).toLocaleString(undefined, {
												style: "currency",
												currency: "AUD",
											})}
										</span>
									</div>
								</ListPage.Item>
							))}
						</ListPage.Items>
					</div>
				))
			) : (
				<Loading />
			)}
		</ListPage>
	);
}

export default ActivityList;
