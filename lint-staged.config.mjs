import { relative } from "node:path";

const buildEslintCommand = (filenames) =>
	`next lint --fix --file ${filenames
		.map((f) => relative(process.cwd(), f))
		.join(" --file ")}`;

export default {
	"*": "prettier --ignore-unknown --write",
	"*.{js,jsx,ts,tsx}": [buildEslintCommand, "bash -c tsc --pretty --noEmit"],
};
