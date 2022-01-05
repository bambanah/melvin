import React from "react";
import styled from "styled-components";

interface ErrorProps {
	error: string | undefined;
	touched: boolean | undefined;
}

const StyledMessage = styled.p`
	color: #f51a1a;
	font-size: 0.8rem;
	margin-top: 0.2rem;
	margin-bottom: 0;
`;

const ErrorMessage = ({ error, touched }: ErrorProps) => {
	if (error && touched) {
		return <StyledMessage>{error}</StyledMessage>;
	}

	return null;
};

export default ErrorMessage;
