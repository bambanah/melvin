!process.env.SKIP_ENV_VALIDATION && require("./src/env/server.js");

const withBundleAnalyzer = require("@next/bundle-analyzer")({
	enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
module.exports = withBundleAnalyzer({
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
});
