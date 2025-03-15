import { includeIgnoreFile } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

const compat = new FlatCompat({
	// import.meta.dirname is available after Node.js v20.11.0
	baseDirectory: import.meta.dirname,
	recommendedConfig: js.configs.recommended
});

const eslintConfig = [
	includeIgnoreFile(gitignorePath),
	...compat.config({
		extends: [
			"eslint:recommended",
			"next/core-web-vitals",
			"next/typescript",
			"prettier"
		],
		rules: {
			"quote-props": ["error", "consistent-as-needed"],
			"@typescript-eslint/no-var-requires": "off",
			"@typescript-eslint/no-empty-interface": "warn",
			"@typescript-eslint/no-require-imports": "off",
			"@typescript-eslint/no-unnused-vars": "off",
			"prefer-template": "error",
			"no-console": [
				"error",
				{
					allow: ["warn", "error"]
				}
			]
		}
	})
];

export default eslintConfig;
