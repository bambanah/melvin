const path = require("node:path");

!process.env.SKIP_ENV_VALIDATION && require("./src/env/server.js");

/** @type {import('next').NextConfig} */
module.exports = {
	async redirects() {
		return [
			{
				source: "/",
				destination: "/invoices",
				permanent: true,
			},
		];
	},
	compiler: {
		styledComponents: true,
	},
	sassOptions: {
		includePaths: [path.join(__dirname, "styles")],
	},
};
