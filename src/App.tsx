import axios from "axios";
import React, { useState, useEffect } from "react";
import styled from "styled-components";

const StyledContainer = styled.div`
	height: 100vh;
`;

function App() {
	const [message, setMessage] = useState("");

	useEffect(() => {
		axios.get("http://localhost:3001").then((res) => {
			setMessage(res.data.message);
		});
	});

	return (
		<StyledContainer className="App">
			<h2>{message}</h2>
			<p>mess</p>
		</StyledContainer>
	);
}

export default App;
