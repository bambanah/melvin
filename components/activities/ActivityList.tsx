import React, { useEffect, useState } from "react";
import firebase from "firebase/app";
import { Activity as ActivityType, ActivityObject } from "../../shared/types";
import { streamActivities } from "../../shared/utils/firebase";
import Activity from "./Activity";
import Table from "../../shared/components/Table";

interface Props {
	setActivityId: (activityId: string | undefined) => void;
	setActivityToLoad: (activity: ActivityType) => void;
}

function ActivityList({ setActivityId, setActivityToLoad }: Props) {
	const [activities, setActivities] = useState<ActivityObject>({});

	useEffect(() => {
		const unsubscribe = streamActivities({
			next: (querySnapshot: firebase.firestore.QuerySnapshot) => {
				const fetchedActivities: ActivityObject = {};
				querySnapshot.forEach((document: firebase.firestore.DocumentData) => {
					const activity: ActivityType = document.data();
					fetchedActivities[document.id] = activity;
				});
				setActivities(fetchedActivities);
			},
			error: (err: Error) => console.error(err.message),
		});
		return unsubscribe;
	}, []);

	return (
		<Table>
			<tbody>
				<tr>
					<th>Description</th>
					<th>Weekday Rate</th>
					<th>Weeknight Rate</th>
					<th>Saturday Rate</th>
					<th>Sunday Rate</th>
					{/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
					<th />
				</tr>
				{Object.keys(activities).map((activityId: string) => (
					<Activity
						activity={activities[activityId]}
						key={activityId}
						activityId={activityId}
						setActivityId={setActivityId}
						setActivityToLoad={setActivityToLoad}
					/>
				))}
			</tbody>
		</Table>
	);
}

export default ActivityList;
