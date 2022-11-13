import styled from "styled-components";

export const AuthDropdown = styled.div`
	position: relative;
	flex: 0 0 2rem;

	margin-left: 1.5rem;

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

export const Profile = styled.div`
	color: ${({ theme }) => theme.colors.fg};
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;

	width: 2rem;
	height: 2rem;

	cursor: pointer;

	&:hover {
		color: ${({ theme }) => theme.colors.brand};
	}
`;

export const DropdownContent = styled.div`
	position: absolute;
	top: 0;
	right: 0;
	margin-top: 2.5rem;
	min-width: 5rem;

	background-color: ${({ theme }) => theme.colors.bg};

	padding: 1rem;

	display: none;
	flex-direction: column;
	gap: 1.5rem;

	box-shadow: 0px 0px 13px rgba(0, 0, 0, 0.3);
`;
