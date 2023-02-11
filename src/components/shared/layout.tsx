import Loading from "@atoms/loading";
import Navbar from "@components/navigation/navbar";
import { breakpoints } from "@styles/themes";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";
import styled from "styled-components";

const Container = styled.div`
	display: flex;
	flex-direction: column;
	width: 100vw;
	min-height: 100vh;

	@media ${breakpoints.tablet} {
		flex-direction: column;
		height: 100%;
	}
`;

const Content = styled.div`
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;

	padding: 3rem;

	@media ${breakpoints.laptop} {
		padding: 3rem 0;
	}

	@media ${breakpoints.tablet} {
		padding: 0.5rem 0;
	}
`;

interface Props {
	children: React.ReactNode;
	isLoading?: boolean;
}

const Layout = ({ children, isLoading }: Props) => {
	const session = useSession();
	const router = useRouter();

	let content: React.ReactNode;

	if (session.status === "unauthenticated") {
		router.push("/login");
		content = <p>Redirecting...</p>;
	}

	if (session.status === "loading" || isLoading) {
		content = <Loading />;
	}

	content = children;

	return (
		<Container>
			<Navbar />

			<Content>{content}</Content>
		</Container>
	);
};

export default Layout;
