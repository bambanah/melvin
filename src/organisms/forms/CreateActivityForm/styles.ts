import styled from "styled-components";

export const InputGroup = styled.div`
	display: flex;
	gap: 1rem;
	flex-wrap: wrap;
	flex: 1 0 100%;
`;

export const ActivityRates = styled.div`
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 1rem;

	h2 {
		flex: 1 0 auto;
	}
`;

export const ActivityRow = styled.div`
	display: flex;
	flex: 1 1 auto;
	gap: 1rem;
	align-items: center;

	label {
		flex: 1 1 20%;
	}

	input {
		flex: 1 1 auto;
	}
`;

export const Heading = styled.h2`
	flex: 1 1 100%;
	font-size: 1.3rem;
	font-weight: bold;
`;
