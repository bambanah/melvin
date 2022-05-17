import Button from "@atoms/button";
import Display from "@atoms/display";
import { useRouter } from "next/router";
import React from "react";
import * as Styles from "./styles";

const Dashboard = () => {
	const router = useRouter();

	return (
		<Styles.Container>
			<Styles.Header>
				<Display className="small">Welcome to Melvin!</Display>
				<Styles.HeaderActions>
					<Button primary onClick={() => router.push("/login")}>
						Login
					</Button>
				</Styles.HeaderActions>
			</Styles.Header>
			<p>This is the dashboard</p>
		</Styles.Container>
	);
};

export default Dashboard;
