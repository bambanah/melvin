import NextDocument, { Html, Head, Main, NextScript } from "next/document";
import React from "react";

class MyDocument extends NextDocument {
	render() {
		return (
			<Html>
				<Head>
					<link
						href="https://fonts.googleapis.com/css2?family=Patua+One&family=Outfit:wght@400;500;700&family=Inter:wght@400;500;700&family=Azeret+Mono:wght@400;500&display=swap"
						rel="stylesheet"
					/>
				</Head>
				<body>
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}

export default MyDocument;
