import { createRouter } from "@server/create-router";
import { z } from "zod";

export const invoiceRouter = createRouter().query("hello", {
	input: z
		.object({
			text: z.string().nullish(),
		})
		.nullish(),
	resolve({ input }) {
		return {
			greeting: `hello ${input?.text ?? "world"}`,
		};
	},
});
