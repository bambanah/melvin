import styled from "styled-components";

const Display = styled.h1`
	font-family: "Patua One";
	font-size: 2.75rem;
	font-weight: 400;
	color: ${({ theme }) => theme.colors.display};

	margin: 0;

	&.large {
		font-size: 96px;
	}

	&.medium {
		font-size: 52px;
	}

	&.small {
		font-size: 44px;
	}

	&.xsmall {
		font-size: 36px;
	}

	&.brand {
		color: ${({ theme }) => theme.colors.brand};
	}
`;

export default Display;
