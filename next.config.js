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
};
