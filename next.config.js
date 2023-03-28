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
};
