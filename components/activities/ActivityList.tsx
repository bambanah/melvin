import React, { useEffect, useState } from "react";
import firebase from "firebase/app";
import { Activity as ActivityType } from "../../shared/types";
import { streamActivities } from "../../shared/utils/firebase";
import Activity from "./Activity";
import Table from "../../shared/components/Table";

function ActivityList() {
	const [activities, setActivities] = useState<ActivityType[]>([]);

	useEffect(() => {
		const unsubscribe = streamActivities({
			next: (querySnapshot: firebase.firestore.QuerySnapshot) => {
				const fetchedActivities: ActivityType[] = [];
				querySnapshot.forEach((document: firebase.firestore.DocumentData) => {
					const activity: ActivityType = document.data();
					fetchedActivities.push(activity);
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
				<tr key="Header">
					<th>Description</th>
					<th>Weekday Rate</th>
					<th>Weeknight Rate</th>
					<th>Saturday Rate</th>
					<th>Sunday Rate</th>
					{/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
					<th />
				</tr>
				{activities.map((activity: ActivityType) => (
					<Activity activity={activity} />
				))}
			</tbody>
		</Table>
	);
}

export default ActivityList;
