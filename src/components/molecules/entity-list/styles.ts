import styled from "styled-components";

export const Container = styled.div`
	align-self: center;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 3rem;
	height: 100%;

	width: 100%;
`;

export const Header = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;

	margin: auto;
	width: 100%;
	max-width: 60em;

	@media screen and (max-width: 1000px) {
		padding: 0 3rem;
	}
`;

export const ExpandedComponent = styled.div`
	height: 0;
	flex: 1 0 100%;

	overflow-y: auto;
	overflow-x: hidden;

	transition: all 0.25s;
`;

export const Content = styled.div`
	flex: 1 0 auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2em;
	padding-bottom: 5em;
`;

export const Entity = styled.div`
	flex: 0 0 auto;
	width: 100%;
	max-width: 60em;
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: stretch;

	color: ${({ theme }) => theme.colors.fg};
	transition: box-shadow 0.2s;

	box-shadow: var(--shadow-low);

	&.expanded {
		box-shadow: var(--shadow-medium);

		.fa-chevron-right {
			transform: rotate(90deg);
		}

		> div:last-of-type {
			height: 30em;
		}
	}
`;

export const EntityContent = styled.div`
	flex: 1 1 auto;
	display: flex;
	align-items: center;
	gap: 1em;
	padding-right: 1.2em;
	width: 100%;
`;

export const EntityDetails = styled.div`
	flex: 1 1 auto;
	display: flex;
	align-items: center;
	min-width: 0;
	padding: 1.6em 1.2em;
	padding-right: 0;

	gap: 1em;
	transition: background 0.1s;

	&.expand {
		cursor: pointer;

		:hover {
			color: ${({ theme }) => theme.colors.brand};

			h1 {
				color: ${({ theme }) => theme.colors.brand};
			}
		}
	}

	h1,
	span {
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}

	svg {
		transition: transform 0.2s;
	}

	.disabled {
		color: ${({ theme }) => theme.colors.fg}77;
	}

	.status {
		flex: 0 0 5em;
		overflow: hidden;

		&.created svg {
			color: #88c656;
		}

		&.sent svg {
			color: #feda22;
		}

		&.complete svg {
			color: ${({ theme }) => theme.colors.fg}88;
		}

		&:focus-within {
			& > div {
				transform: scaleY(1);
			}
		}

		& > div {
			display: flex;
			flex-direction: column;
			overflow: hidden;
			position: absolute;
			transform: scaleY(0);
		}
	}
`;

export const Actions = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1 0 100%;
	overflow: hidden;
	gap: 2em;

	height: 0;
	opacity: 0;

	transition: opacity 0.1s, height 0.1s;

	a {
		padding: 0.3em 0.8em;
		color: ${({ theme }) => theme.colors.fg}99;
		background-color: ${({ theme }) => theme.colors.bg};
		box-shadow: 0px 0px 16px rgba(0, 0, 0, 0.12);

		svg {
			margin-right: 0.3em;
		}

		&:hover {
			color: ${({ theme }) => theme.colors.brand};
		}
	}

	& > div {
		padding: 0.8em;
		transition: color 0.1s ease;
		color: ${({ theme }) => theme.colors.fg}99;

		&:hover {
			color: ${({ theme }) => theme.colors.brand};
		}
	}
`;
