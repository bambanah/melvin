import EntityList, { EntityListItem } from "@components/shared/entity-list";
import { faClock } from "@fortawesome/free-regular-svg-icons";
import {
	faArrowRight,
	faEdit,
	faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { ActivityFetchAllOutput } from "@server/routers/activity-router";
import { trpc } from "@utils/trpc";
import dayjs from "dayjs";
import Skeleton from "react-loading-skeleton";

const generateEntity = (activity?: ActivityFetchAllOutput): EntityListItem => ({
	id: activity?.id || "",
	fields: [
		{
			value: activity ? (
				`${dayjs(activity.date).format("DD/MM/YY")}`
			) : (
				<Skeleton />
			),
			type: "text",
			flex: "0 0 6em",
		},
		{
			value: activity ? `${activity.client?.name}` : <Skeleton />,
			type: "text",
			flex: "0 0 8em",
		},
		{
			value: activity ? `${activity.supportItem.description}` : <Skeleton />,
			type: "label",
			flex: "1 1 auto",
		},
		{
			value: activity ? (
				`${dayjs(activity.startTime).format("hh:mma")}`
			) : (
				<Skeleton />
			),
			icon: faClock,
			type: "text",
			flex: "0 0 5.7em",
		},
		{
			value: activity ? (
				`${dayjs(activity.endTime).format("hh:mma")}`
			) : (
				<Skeleton />
			),
			icon: faArrowRight,
			type: "text",
			flex: "0 0 7em",
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
	const { data: { activities } = {}, error } = trpc.activity.list.useQuery();

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	return (
		<EntityList
			title="Activities"
			route="/activities"
			entities={
				activities
					? activities.map((activity) => generateEntity(activity))
					: [generateEntity()]
			}
		/>
	);
}

export default ActivityList;
