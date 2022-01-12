// eslint-disable-next-line @typescript-eslint/no-var-requires
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
		// load worker files as a urls with `file-loader`
		config.module.rules.unshift({
			test: /pdf\.worker\.(min\.)?js/,
			use: [
				{
					loader: "file-loader",
					options: {
						name: "[contenthash].[ext]",
						publicPath: "_next/static/worker",
						outputPath: "static/worker",
					},
				},
			],
		});

		return config;
	},
};
