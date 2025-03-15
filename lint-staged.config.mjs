/**
 * @filename: lint-staged.config.mjs
 * @type {import('lint-staged').Configuration}
 */
const config = {
	"*": "prettier --ignore-unknown --write",
	"*.{js,jsx,ts,tsx}": [
		"eslint --fix",
		"eslint",
		"bash -c tsc --pretty --noEmit"
	]
};

export default config;
