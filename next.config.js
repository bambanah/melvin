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
	future: {
		webpack5: true,
	},
	target: "serverless",
	sassOptions: {
		includePaths: [path.join(__dirname, "styles")],
	},
};
