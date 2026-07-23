export default {
	"*": "prettier --ignore-unknown --write",
	"*.{js,jsx,ts,tsx}": "eslint --fix",
	"*.{js,jsx,ts,tsx,json}": () => "tsc --noEmit --pretty"
};
