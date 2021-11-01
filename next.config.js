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
	sassOptions: {
		includePaths: [path.join(__dirname, "styles")],
	},
};
