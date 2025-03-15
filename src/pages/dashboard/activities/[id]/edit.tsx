import Loading from "@/components/ui/loading";
import NotFound from "@/components/ui/not-found";
import ActivityForm from "@/components/activities/activity-form";
import Layout from "@/components/shared/layout";
import { trpc } from "@/lib/trpc";
import Head from "next/head";
import { useRouter } from "next/router";
import Heading from "@/components/ui/heading";

const EditActivityContent = () => {
	const router = useRouter();
	const activityId = Array.isArray(router.query.id)
		? router.query.id[0]
		: router.query.id;

	const { data: activity, error } = trpc.activity.byId.useQuery({
		id: activityId ?? ""
	});

	if (error) {
		return error.data?.code === "NOT_FOUND" ? (
			<NotFound />
		) : (
			<div>
				<span>An error occurred</span>
				<span>{error.message}</span>
			</div>
		);
	}

	return activity ? (
		<>
			<Head>
				<title>Modifying Activity - Melvin</title>
			</Head>

			<div className="mx-auto flex w-full max-w-md flex-col items-center gap-12">
				<Heading>Update Activity</Heading>
				<ActivityForm existingActivity={activity} />
			</div>
		</>
	) : (
		<Loading />
	);
};

const EditActivity = () => (
	<Layout>
		<EditActivityContent />
	</Layout>
);

export default EditActivity;
