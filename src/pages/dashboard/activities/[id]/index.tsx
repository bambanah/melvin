const ActivityPage = dynamic(
	() => import("@/components/activities/activity-page")
);
import Layout from "@/components/shared/layout";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const Activity = () => {
	const router = useRouter();
	const activityId = Array.isArray(router.query.id)
		? router.query.id[0]
		: router.query.id;

	return (
		<Layout>{activityId && <ActivityPage activityId={activityId} />}</Layout>
	);
};

export default Activity;
