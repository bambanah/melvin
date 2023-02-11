import GenericForm from "@atoms/form";
import styled from "styled-components";

export const CreateActivityContainer = styled.div`
	padding: 3rem 0;
	align-self: center;

	display: flex;
	flex-direction: column;
	gap: 3rem;
	align-items: center;
`;

export const Heading = styled.h2`
	flex: 0 1 100%;
	font-size: 1.3rem;
	font-weight: bold;
	margin: 0;
`;

export const Form = styled(GenericForm)`
	max-width: 40rem;
	gap: 3rem;
`;

export const InputRow = styled.div`
	width: 100%;
	max-width: 100%;
	display: flex;
	gap: 1rem;
	justify-content: center;
`;
