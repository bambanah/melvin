import styled from "styled-components";

const Control = styled.div`
	flex: 1 0 auto;
	display: flex;

	input,
	.select {
		flex: 1 0 auto;
		display: flex;
		select {
			flex: 1 0 auto;
		}
	}
`;

export default Control;
