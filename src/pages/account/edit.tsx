import Loading from "@atoms/loading";
import AccountForm from "@components/account/account-form";
import Layout from "@components/shared/layout";
import { trpc } from "@utils/trpc";
import React from "react";

const EditAccountPage = () => {
	const { data: user, error } = trpc.user.fetch.useQuery();

	if (error) {
		return <div>Error</div>;
	}
	if (!user) {
		return (
			<Layout>
				<Loading />
			</Layout>
		);
	}

	return (
		<Layout>
			<AccountForm existingUser={user} />
		</Layout>
	);
};

export default EditAccountPage;
