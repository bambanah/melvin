import styled from "styled-components";

interface Props {
	children: string;
	variant?: "info" | "success" | "warning" | "danger";
}

const StyledBadge = styled.div`
	padding: 0.3rem 0.4rem;
	font-size: 12px;
	border-radius: 5px;
	font-weight: bold;

	color: ${({ theme }) => theme.colors.fg};
	background-color: #dcdfe2;

	&.info {
		background-color: ${({ theme }) => theme.colors.info};
	}

	&.success {
		background-color: ${({ theme }) => theme.colors.success};
	}

	&.warning {
		background-color: ${({ theme }) => theme.colors.warning};
	}

	&.danger {
		background-color: ${({ theme }) => theme.colors.error};
	}
`;

const Badge = ({ children, variant }: Props) => {
	return <StyledBadge className={variant}>{children}</StyledBadge>;
};

export default Badge;
