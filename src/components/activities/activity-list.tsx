import Badge from "@atoms/badge";
import Loading from "@atoms/loading";
import ListPage from "@components/shared/list-page";
import {
	faClock,
	faMoneyBillWave,
	faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ActivityListOutput } from "@server/api/routers/activity-router";
import { getTotalCostOfActivities } from "@utils/activity-utils";
import { isHoliday as isDateHoliday } from "@utils/date-utils";
import { groupBy } from "@utils/generic-utils";
import { trpc } from "@utils/trpc";
import classNames from "classnames";
import dayjs from "dayjs";
import { useState } from "react";

interface Props {
	invoiceId?: string;
	displayCreateButton?: boolean;
	groupByAssignedStatus?: boolean;
}

function ActivityList({
	invoiceId,
	displayCreateButton = true,
	groupByAssignedStatus = true,
}: Props) {
	const [assignedFilter, setAssignedFilter] = useState<boolean>(false);

	const { data: { activities } = {}, error } = trpc.activity.list.useQuery({
		assigned: groupByAssignedStatus ? assignedFilter : undefined,
		invoiceId,
	});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	// TODO: Display something other than "Loading..." when there are no activities

	const groupedActivities: { [key: string]: ActivityListOutput[] } = activities
		? groupBy(activities, (activity) => dayjs(activity.date).toString())
		: {};

	return (
		<ListPage
			title="Activities"
			createHref={displayCreateButton ? "/activities/create" : undefined}
		>
			{groupByAssignedStatus && (
				<div className="mb-4 w-full border-b">
					<div className="-mb-[1px] flex w-full md:max-w-xs">
						{[false, true].map((status, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => setAssignedFilter(status)}
								className={classNames([
									"basis-1/2 border-b px-4 py-2 text-center transition-all",
									assignedFilter === status &&
										"border-indigo-700 text-indigo-700",
								])}
							>
								{status ? "ASSIGNED" : "UNASSIGNED"}
							</button>
						))}
					</div>
				</div>
			)}

			{Object.keys(groupedActivities).length > 0 ? (
				Object.keys(groupedActivities).map((group) => (
					<div key={group} className="mb-4 overflow-hidden">
						<div className="flex w-full items-center gap-2 border-b px-4 py-2 text-left">
							{dayjs(group).format("dddd D MMM.")}
							{isDateHoliday(group) && <Badge variant="INFO">Holiday</Badge>}
						</div>

						<ListPage.Items>
							{groupedActivities[group].map((activity) => (
								<ListPage.Item
									href={`/activities/${activity.id}`}
									key={activity.id}
									className="flex-col md:flex-row"
								>
									<div className="flex flex-col gap-2 overflow-hidden">
										<p className="truncate text-lg font-semibold">
											{activity.supportItem.description}
										</p>
										<div className="flex items-center gap-2 whitespace-nowrap">
											<FontAwesomeIcon
												icon={faClock}
												className="w-4 text-gray-600"
											/>
											{dayjs.utc(activity.startTime).format("HH:mm")} -{" "}
											{dayjs.utc(activity.endTime).format("HH:mm")}
										</div>
									</div>
									<div className="flex flex-col items-start justify-between gap-2 md:items-end">
										<div className="flex items-center gap-2 md:flex-row-reverse md:font-semibold">
											<FontAwesomeIcon
												icon={faUser}
												className="w-4 text-gray-600"
											/>
											<span>{activity.client?.name}</span>
										</div>
										<div className="flex items-center gap-2 md:flex-row-reverse">
											<FontAwesomeIcon
												icon={faMoneyBillWave}
												className="w-4 text-gray-600"
											/>
											<span>
												{getTotalCostOfActivities([activity]).toLocaleString(
													undefined,
													{
														style: "currency",
														currency: "AUD",
													}
												)}
											</span>
										</div>
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
