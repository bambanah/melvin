import { useSession } from "next-auth/react";
import React from "react";
import ActivityList from "@organisms/activity-list";
import Layout from "@layouts/common/layout";

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
