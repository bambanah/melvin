import ActivityForm from "@/components/activities/activity-form";
import Layout from "@/components/shared/layout";
import Heading from "@/components/ui/heading";

const CreateActivity = () => {
	return (
		<Layout>
			<div className="mx-auto flex w-full max-w-md flex-col items-center gap-12">
				<Heading>Log Activity</Heading>

				<ActivityForm />
			</div>
		</Layout>
	);
};

export default CreateActivity;
