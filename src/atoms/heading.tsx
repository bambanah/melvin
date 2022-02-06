import styled from "styled-components";

const Heading = styled.h1`
	font-size: 28px;
	font-weight: 600;
	line-height: 1.125;
	color: ${({ theme }) => theme.colors.fg};
	word-break: break-word;
	margin: 0;

	&.xlarge {
		font-size: 40px;
	}

	&.large {
		font-size: 36px;
	}

	&.medium {
		font-size: 28px;
	}

	&.small {
		font-size: 24px;
	}

	&.xsmall {
		font-size: 20px;
	}
`;

export default Heading;
