import React, { useEffect, useState } from "react";
import firebase from "firebase/app";
import { Activity } from "../../shared/types";
import { streamActivities } from "../../shared/utils/firebase";

function ActivityList() {
	const [activities, setActivities] = useState<Activity[]>([]);

	useEffect(() => {
		const unsubscribe = streamActivities({
			next: (querySnapshot: firebase.firestore.QuerySnapshot) => {
				const fetchedActivities: Activity[] = [];
				querySnapshot.forEach((document: firebase.firestore.DocumentData) => {
					const activity: Activity = document.data();
					fetchedActivities.push(activity);
				});
				console.log(fetchedActivities);
				setActivities(fetchedActivities);
			},
			error: (err: Error) => console.error(err.message),
		});
		return unsubscribe;
	}, []);

	return (
		<ul>
			{activities.map((activity: Activity) => (
				// <Invoice
				// 	invoice={activity}
				// 	key={activity.weekday.item_code}
				// />
				<li>{activity.description}</li>
			))}
		</ul>
	);
}

export default ActivityList;
