import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Button from "../components/shared/Button";
import ActivityList from "../components/activities/ActivityList";
import Layout from "../components/shared/Layout";
import Title from "../components/shared/text/Title";
import CreateActivityForm from "../components/activities/CreateActivityForm";

const CreateActivityContainer = styled.div`
	margin-bottom: 2rem;
	padding: 3rem;
	border-radius: 4px;
	box-shadow: 2px 2px 10px #00000050;
	max-width: 700px;
	align-self: center;
`;

function Activities() {
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);

	useEffect(() => {
		setLoading(false);
	}, []);

	if (!loading) {
		return (
			<Layout>
				{creating && (
					<CreateActivityContainer>
						<Title>New Activity</Title>
						<CreateActivityForm setCreating={setCreating} />
					</CreateActivityContainer>
				)}

				<Title>Activities</Title>

				{!creating && (
					<Button onClick={() => setCreating(true)}>Create New</Button>
				)}

				<ActivityList />
			</Layout>
		);
	}

	return <div>Loading...</div>;
}

export default Activities;
