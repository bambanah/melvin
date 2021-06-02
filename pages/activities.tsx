import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Button from "../shared/components/Button";
import ActivityList from "../components/activities/ActivityList";
import Layout from "../shared/components/Layout";
import Title from "../shared/components/text/Title";
import CreateActivityForm from "../components/activities/CreateActivityForm";
import { Activity } from "../shared/types";

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
	const [activityToLoad, setActivityToLoad] =
		useState<Activity | undefined>(undefined);
	const [activityId, setActivityId] = useState<string | undefined>(undefined);

	useEffect(() => {
		setLoading(false);
	}, []);

	useEffect(() => {
		if (activityToLoad) setCreating(true);
	}, [activityToLoad]);

	useEffect(() => {
		if (!creating) {
			setActivityToLoad(undefined);
			setActivityId(undefined);
		}
	}, [creating]);

	if (!loading) {
		return (
			<Layout>
				{creating && (
					<CreateActivityContainer>
						<Title>{activityToLoad ? "Update" : "New"} Activity</Title>
						<CreateActivityForm
							setCreating={setCreating}
							activityToLoad={activityToLoad}
							activityId={activityId}
						/>
					</CreateActivityContainer>
				)}

				<Title>Activities</Title>

				{!creating && (
					<Button onClick={() => setCreating(true)}>Create New</Button>
				)}

				<ActivityList
					setActivityToLoad={setActivityToLoad}
					setActivityId={setActivityId}
				/>
			</Layout>
		);
	}

	return <div>Loading...</div>;
}

export default Activities;
