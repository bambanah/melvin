import Layout from "@layouts/common/Layout";
import CreateActivityForm from "@organisms/forms/CreateActivityForm";
import React from "react";
import styled from "styled-components";

const CreateActivityContainer = styled.div`
	margin-bottom: 2rem;
	padding: 3rem;
	border-radius: 4px;
	max-width: 700px;
	align-self: center;
`;

const CreateActivity = () => {
	return (
		<Layout>
			<CreateActivityContainer>
				<CreateActivityForm />
			</CreateActivityContainer>
		</Layout>
	);
};

export default CreateActivity;
