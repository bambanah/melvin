// @ts-check
const { serverSchema } = require("./schema.js");

const serverEnv = serverSchema.safeParse(process.env);

const formatErrors = (
	/** @type {import('zod').ZodFormattedError<Map<string,string>,string>} */
	errors
) =>
	Object.entries(errors)
		.map(([name, value]) => {
			return value && "_errors" in value
				? `${name}: ${value._errors.join(", ")}\n`
				: undefined;
		})
		.filter(Boolean);

if (!serverEnv.success) {
	console.error(
		"❌ Invalid environment variables:\n",
		...formatErrors(serverEnv.error.format())
	);
	throw new Error("Invalid environment variables");
}

for (let key of Object.keys(serverEnv.data)) {
	if (key.startsWith("NEXT_PUBLIC_")) {
		console.warn("❌ You are exposing a server-side env-variable:", key);

		throw new Error("You are exposing a server-side env-variable");
	}
}

module.exports = { env: { ...serverEnv.data } };
