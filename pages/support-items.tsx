import { useSession } from "next-auth/react";
import React, { useState } from "react";
import styled from "styled-components";
import SupportItemList from "../components/activities/ActivityList";
import CreateSupportItemForm from "../components/activities/CreateActivityForm";
import Button from "../shared/components/Button";
import Layout from "../shared/components/Layout";
import Title from "../shared/components/text/Title";

const CreateActivityContainer = styled.div`
	margin-bottom: 2rem;
	padding: 3rem;
	border-radius: 4px;
	box-shadow: 2px 2px 10px #00000050;
	max-width: 700px;
	align-self: center;
`;

function SupportItems() {
	const { status } = useSession({
		required: true,
	});

	const [creating, setCreating] = useState(false);

	if (status === "loading") {
		return <div>Loading...</div>;
	}

	return (
		<Layout>
			{creating && (
				<CreateActivityContainer>
					<Title>New Activity</Title>
					<CreateSupportItemForm setCreating={setCreating} />
				</CreateActivityContainer>
			)}

			<Title>Activities</Title>

			{!creating && (
				<Button onClick={() => setCreating(true)}>Create New</Button>
			)}

			<SupportItemList />
		</Layout>
	);
}

export default SupportItems;
