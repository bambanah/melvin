import { useSession } from "next-auth/react";
import React from "react";
import ActivityList from "@components/activities/activity-list";
import Layout from "@components/shared/layout";

function Activities() {
	const { status } = useSession({
		required: true,
	});

	if (status === "loading") {
		return <div>Loading...</div>;
	}

	return (
		<Layout>
			<ActivityList />
		</Layout>
	);
}

export default Activities;
