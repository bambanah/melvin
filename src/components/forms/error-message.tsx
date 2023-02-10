import styled from "styled-components";

interface ErrorProps {
	error: string | undefined;
}

const StyledMessage = styled.p`
	transition: all 0.2s ease;
	color: ${({ theme }) => theme.colors.error};
	font-size: 0.8rem;
	margin-top: 0.3rem;
	margin-bottom: 0;
	height: 1rem;
	opacity: 1;
`;

const ErrorMessage = ({ error }: ErrorProps) => {
	if (!error) return <></>;

	return <StyledMessage>{error}</StyledMessage>;
};

export default ErrorMessage;
