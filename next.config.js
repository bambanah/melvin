const path = require("path");

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
	experimental: {
		styledComponents: true,
	},
	sassOptions: {
		includePaths: [path.join(__dirname, "styles")],
	},
	eslint: {
		dirs: ["."],
	},
	webpack: (config) => {
		return config;
	},
};
