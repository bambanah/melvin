import Button from "@atoms/button";
import Display from "@atoms/display";
import React from "react";
import * as Styles from "./styles";

const Dashboard = () => {
	return (
		<Styles.Container>
			<Styles.Header>
				<Display className="small">Dashboard</Display>
				<Styles.HeaderActions>
					<Button>?</Button>
					<Button primary>+ Add New</Button>
				</Styles.HeaderActions>
			</Styles.Header>
			<p>This is the dashboard</p>
		</Styles.Container>
	);
};

export default Dashboard;
