import ActivityList from "@components/activities/activity-list";
import Layout from "@components/shared/layout";
import { useSession } from "next-auth/react";

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
