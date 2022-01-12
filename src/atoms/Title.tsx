import styled from "styled-components";

const Title = styled.h1`
	font-size: 2rem;
	font-weight: 600;
	line-height: 1.125;
	color: ${(props) => props.theme.colors.fg};
	word-break: break-word;
	margin: 0;
	margin-bottom: 1.5rem;

	font-family: "Inter";
`;

export default Title;
