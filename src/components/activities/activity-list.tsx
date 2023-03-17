import Loading from "@atoms/loading";
import ListPage from "@components/shared/list-page";
import { getDuration, getTotalCost, round } from "@utils/helpers";
import { trpc } from "@utils/trpc";
import classNames from "classnames";
import dayjs from "dayjs";
import { useState } from "react";

function ActivityList() {
	const [assignedFilter, setAssignedFilter] = useState<boolean>(false);

	const { data: { activities } = {}, error } = trpc.activity.list.useQuery({
		assigned: assignedFilter,
	});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	return (
		<ListPage title="Activities" createHref="/activities/create">
			<div className="flex w-full">
				{[false, true].map((status, idx) => (
					<button
						key={idx}
						type="button"
						onClick={() => setAssignedFilter(status)}
						className={classNames([
							"basis-1/2 border-b-[3px] px-4 py-2 text-center transition-all",
							assignedFilter === status && "border-indigo-700 text-indigo-700",
						])}
					>
						{status ? "ASSIGNED" : "UNASSIGNED"}
					</button>
				))}
			</div>
			<ListPage.Items>
				{activities ? (
					activities.map((activity) => (
						<ListPage.Item
							href={`/activities/${activity.id}`}
							key={activity.id}
						>
							<div className="flex flex-col gap-2 overflow-hidden">
								<span className="font-semibold">{activity.client?.name}</span>
								<p className="truncate">{activity.supportItem.description}</p>
								<p>
									{dayjs(activity.startTime).format("h:mma")}-
									{dayjs(activity.endTime).format("h:mma")} (
									{round(getDuration(activity.startTime, activity.endTime), 1)}
									h)
								</p>
							</div>
							<div className="flex flex-col items-end justify-between gap-2">
								<span className="font-semibold">
									{getTotalCost([activity]).toLocaleString(undefined, {
										style: "currency",
										currency: "AUD",
									})}
								</span>
								<span>${Number(activity.supportItem.weekdayRate)}/hr</span>
							</div>
						</ListPage.Item>
					))
				) : (
					<Loading />
				)}
			</ListPage.Items>
		</ListPage>
	);
}

export default ActivityList;
