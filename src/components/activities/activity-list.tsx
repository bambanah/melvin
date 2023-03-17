import Loading from "@atoms/loading";
import ListPage from "@components/shared/list-page";
import { getDuration, getTotalCost, round } from "@utils/helpers";
import { trpc } from "@utils/trpc";
import classNames from "classnames";
import dayjs from "dayjs";
import { useState } from "react";
import { groupBy } from "@utils/helpers";
import { ActivityFetchAllOutput } from "@server/routers/activity-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

function ActivityList() {
	const [assignedFilter, setAssignedFilter] = useState<boolean>(false);
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		new Set()
	);

	const toggleGroupHidden = (group: string) => {
		const newSet = new Set(collapsedGroups);
		if (collapsedGroups.has(group)) {
			newSet.delete(group);
		} else {
			newSet.add(group);
		}

		setCollapsedGroups(newSet);
	};

	const { data: { activities } = {}, error } = trpc.activity.list.useQuery({
		assigned: assignedFilter,
	});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	const groupedActivities: { [key: string]: ActivityFetchAllOutput[] } =
		activities
			? groupBy(activities, (activity) =>
					dayjs(activity.date).format("dddd DD MMM.")
			  )
			: {};

	return (
		<ListPage title="Activities" createHref="/activities/create">
			<div className="mb-4 flex w-full">
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

			{Object.keys(groupedActivities).length > 0 ? (
				Object.keys(groupedActivities).map((group) => (
					<div key={group} className="mb-4">
						<button
							className="w-full cursor-pointer border-b px-4 py-2 text-left text-lg"
							type="button"
							onClick={() => toggleGroupHidden(group)}
						>
							<FontAwesomeIcon
								icon={faChevronDown}
								className={classNames([
									collapsedGroups.has(group) ? "-rotate-90" : "",
									"mr-2 transition-transform",
								])}
							/>{" "}
							{group}
						</button>
						{!collapsedGroups.has(group) && (
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
											<span>{dayjs(activity.date).format("dddd DD MMM")}</span>
										</div>
										<div className="flex flex-col items-end justify-between gap-2">
											<p>
												{dayjs(activity.startTime).format("h:mma")}-
												{dayjs(activity.endTime).format("h:mma")} (
												{round(
													getDuration(activity.startTime, activity.endTime),
													1
												)}
												h)
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
						)}
					</div>
				))
			) : (
				<Loading />
			)}
		</ListPage>
	);
}

export default ActivityList;
