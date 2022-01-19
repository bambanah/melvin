import React from "react";
import styled from "styled-components";
import Navbar from "@organisms/navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Loading from "@atoms/loading";

interface Props {
	children: React.ReactNode;
}

const Container = styled.div`
	display: flex;
	flex-direction: row;
	width: 100vw;
	height: 100vh;

	overflow: hidden;
`;

const Content = styled.div`
	flex: 1 0 auto;
	display: flex;
	flex-direction: column;

	overflow-y: auto;
`;

const Layout: React.FC<Props> = ({ children }) => {
	const session = useSession();
	const router = useRouter();

	if (session.status === "loading") {
		return <Loading />;
	}

	if (session.status === "unauthenticated") {
		router.push("/login");
		return <p>Redirecting...</p>;
	}

	return (
		<Container>
			<Navbar />

			<Content>{children}</Content>
		</Container>
	);
};

export default Layout;
