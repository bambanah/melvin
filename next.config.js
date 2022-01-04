const path = require("path");

module.exports = {
	experimental: {
		styledComponents: true,
	},
	sassOptions: {
		includePaths: [path.join(__dirname, "styles")],
	},
};
