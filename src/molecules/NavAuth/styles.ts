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
	margin-top: 2.5rem;
	min-width: 5rem;
	border-radius: 5px;
	border: 1px solid #ddd;

	background-color: white;
	padding: 1rem;

	display: none;
	flex-direction: column;
	gap: 1.5rem;

	box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);

	button {
		cursor: pointer;
		border: none;
		background: none;
		font: inherit;
		padding: 0.4rem;
		border-radius: 4px;
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

	border-radius: 100%;
	background-color: #b19cd9;
	color: #000;

	cursor: pointer;
`;
