import styled from "styled-components";

export const CreateActivityContainer = styled.div`
	padding: 3rem 0;
	border-radius: 4px;
	align-self: center;
`;

export const InputGroup = styled.div`
	flex: 0 1 auto;

	display: flex;
	flex-direction: column;
	gap: 1rem;
`;

export const InputRow = styled.div`
	display: flex;
	gap: 1rem;
`;

export const ActivityRow = styled.div`
	display: flex;
	flex: 1 1 auto;
	gap: 1rem;
	align-items: center;

	input {
		flex: 1 1 auto;
	}

	&:not(:first-of-type) {
		margin-top: 1.1rem;
	}
`;

export const Heading = styled.h2`
	flex: 0 0 100%;
	font-size: 1.3rem;
	font-weight: bold;
	margin: 0;
`;

export const InputContainer = styled.div`
	p {
		position: absolute;
	}
`;
