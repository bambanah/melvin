const path = require("path");

module.exports = {
	async redirects() {
		return [
			{
				source: "/",
				destination: "/dashboard/invoices",
				permanent: true,
			},
			{
				source: "/dashboard",
				destination: "/dashboard/invoices",
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
	eslint: {
		dirs: ["."],
	},
	webpack: (config) => {
		return config;
	},
};
