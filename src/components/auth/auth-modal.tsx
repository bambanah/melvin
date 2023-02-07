import styled from "styled-components";

export const ModalContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;

	min-height: 100vh;
`;

export const StyledModal = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: stretch;
	align-items: center;
	gap: 1.9rem;
	min-width: 26rem;

	padding: 3rem;

	span {
		cursor: auto;
	}

	button {
		width: 100%;

		svg {
			margin-right: 0.4rem;
		}
	}

	p {
		margin: 0;
	}
`;

interface Props {
	children: React.ReactNode | React.ReactNode[];
}

const AuthModal = ({ children }: Props) => {
	return (
		<ModalContainer>
			<StyledModal>{children}</StyledModal>
		</ModalContainer>
	);
};

export default AuthModal;
