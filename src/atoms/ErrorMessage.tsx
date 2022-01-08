import React from "react";
import styled from "styled-components";

interface ErrorProps {
	error: string | undefined;
	touched: boolean | undefined;
}

const StyledMessage = styled.p`
	transition: all 0.2s ease;
	color: ${({ theme }) => theme.colors.error};
	font-size: 0.8rem;
	margin-top: 0.3rem;
	margin-bottom: 0;
	height: 0;
	opacity: 0;

	&.show {
		height: 1rem;
		opacity: 1;
	}
`;

const ErrorMessage = ({ error, touched }: ErrorProps) => {
	return (
		<StyledMessage className={error && touched ? "show" : ""}>
			{error ?? " "}
		</StyledMessage>
	);
};

export default ErrorMessage;
