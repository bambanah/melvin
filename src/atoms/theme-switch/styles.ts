import styled from "styled-components";

export const Wrapper = styled.div`
	font-size: 16px;
	display: flex;
	flex-direction: row;
	-moz-box-align: center;
	align-items: center;
	position: relative;
	height: 2em;
	width: 4em;
	border-radius: 1em;
	transition: all 200ms linear 0s;
	cursor: pointer;
	user-select: none !important;

	&.light {
		background: rgb(128, 199, 203);
		background: linear-gradient(
			223deg,
			rgba(128, 199, 203, 1) 0%,
			rgba(147, 241, 177, 1) 100%
		);
	}

	&.dark {
		background: rgb(71, 75, 195);
		background: linear-gradient(
			270deg,
			rgba(71, 75, 195, 1) 0%,
			rgba(89, 93, 222, 1) 100%
		);
	}
`;

export const Circle = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	position: relative;
	border-radius: 100%;
	width: 1.4em;
	overflow: hidden;
	height: 1.4em;
	transition: all 200ms ease;

	&.light {
		transform: translateX(0.3em);
		background-color: rgb(253, 223, 117);
		border: 3px solid rgba(214, 176, 94, 0.71);

		svg {
			transform: translateY(30px);
			opacity: 0;
		}
	}

	&.dark {
		transform: translateX(2.3em);
		background-color: rgba(255, 255, 255, 0.4);
		border: 2px solid rgba(255, 255, 255, 0.9);
	}

	svg {
		position: absolute;
		transition: all 150ms ease 0s;
		width: 0.8em;
		height: 0.8em;
		fill: white;
		opacity: 1;
	}
`;

export const Stars = styled.div`
	&.dark {
		opacity: 1;
	}
`;

interface StarProps {
	x: number;
	y: number;
	size: number;
	speed: number;
}

export const Star = styled.div<StarProps>`
	opacity: 1;
	border-radius: 100%;
	background-color: white;
	position: absolute;
	transition: all ${(props) => props.speed}ms linear 0ms;

	width: ${(props) => props.size}px;
	height: ${(props) => props.size}px;
	left: ${(props) => props.x + 8}px;
	top: ${(props) => props.y + 8}px;

	&.light {
		opacity: 0;
		transform: translateY(10px);
	}
`;
