import generatePDF from "@/lib/pdf-generation";
import { authedProcedure, router } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const pdfRouter = router({
	forInvoice: authedProcedure
		.input(
			z.object({
				invoiceId: z.string(),
				returnBase64: z.boolean().nullish(),
			})
		)
		.query(async ({ input }) => {
			const { invoiceId, returnBase64 } = input;

			const { pdfString } = await generatePDF(invoiceId);

			if (!pdfString) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			if (returnBase64) {
				return `data:application/pdf;base64,${pdfString}`;
			}

			const pdfContent = Buffer.from(pdfString, "base64").toString();

			return pdfContent;
		}),
});
