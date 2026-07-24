import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	prettier,
	{
		rules: {
			"@typescript-eslint/no-require-imports": "off",
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "dayjs",
							message: "Use date-fns (+ @date-fns/tz for UTC) instead of dayjs."
						}
					],
					patterns: [
						{
							group: ["dayjs/*"],
							message: "Use date-fns (+ @date-fns/tz for UTC) instead of dayjs."
						}
					]
				}
			]
		}
	},
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"public/**",
		"next-env.d.ts"
	])
]);

export default eslintConfig;
