import {
	faDollarSign,
	faEdit,
	faIdCard,
	faTrash,
} from "@fortawesome/free-solid-svg-icons";
import EntityList, { EntityListItem } from "@molecules/entity-list";
import { activityRouter } from "@server/routers/activity-router";
import { inferRouterOutputs } from "@trpc/server";
import { trpc } from "@utils/trpc";
import Skeleton from "react-loading-skeleton";

type ActivityType = inferRouterOutputs<
	typeof activityRouter
>["list"]["activities"][0];

const generateEntity = (activity?: ActivityType): EntityListItem => ({
	id: activity?.id || "",
	fields: [
		{
			value: activity ? `${activity.date}` : <Skeleton />,
			type: "label",
			flex: "1 1 auto",
		},
		{
			value: activity ? `${activity.startTime}` : <Skeleton />,
			icon: faIdCard,
			type: "text",
			flex: "0 0 9.5em",
		},
		{
			value: activity ? `${activity.endTime}` : <Skeleton />,
			icon: faDollarSign,
			type: "text",
			flex: "0 0 5em",
		},
	],
	actions: activity
		? [
				{
					value: "Edit",
					type: "link",
					icon: faEdit,
					href: `/activities/${activity.id}?edit=true`,
				},
				{
					value: "Delete",
					type: "button",
					icon: faTrash,
					onClick: () => {
						if (confirm(`Are you sure you want to delete this activity?`)) {
							trpc.activity.delete.useMutation().mutate({ id: activity.id });
						}
					},
				},
		  ]
		: [],
});

function ActivityList() {
	const activities = trpc.activity.list.useQuery();

	if (activities.error) {
		console.error(activities.error);
		return <div>Error loading</div>;
	}

	if (!activities.data)
		return <EntityList title="Activities" entities={[generateEntity()]} />;

	return (
		<EntityList
			title="Activities"
			route="/activities"
			entities={activities.data.activities.map((activity) =>
				generateEntity(activity)
			)}
		/>
	);
}

export default ActivityList;
