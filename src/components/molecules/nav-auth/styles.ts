import styled from "styled-components";

export const AuthDropdown = styled.div`
	flex: 0 0 2rem;

	display: flex;
	align-items: flex-end;
	justify-content: flex-start;
	flex-direction: column;

	span {
		margin-right: 0.3rem;
	}

	&:focus-within {
		div:last-of-type {
			display: flex;
		}
	}
`;

export const DropdownContent = styled.div`
	position: absolute;
	bottom: 5rem;
	left: 8rem;
	margin-top: 2.5rem;
	min-width: 5rem;

	background-color: ${({ theme }) => theme.colors.bg};

	padding: 1rem;

	display: none;
	flex-direction: column;
	gap: 1.5rem;

	box-shadow: 0px 0px 13px rgba(0, 0, 0, 0.3);

	button {
		cursor: pointer;
		border: none;
		background: none;
		font: inherit;
		padding: 0.4rem;
		background-color: #f3f3f3;

		&:hover {
			background-color: #ddd;
		}
	}
`;

export const Profile = styled.div`
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;

	width: 2rem;
	height: 2rem;

	border-radius: 50%;
	background-color: ${({ theme }) => theme.colors.brand};
	font-size: 1.3rem;
	font-weight: bold;
	color: #fff;

	cursor: pointer;
`;
