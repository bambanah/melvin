import { authedProcedure, router } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import generatePDF from "@/lib/pdf-generation";
import { z } from "zod";
import { invoiceRouter } from "./invoice-router";

export const pdfRouter = router({
	forInvoice: authedProcedure
		.input(
			z.object({
				invoiceId: z.string(),
				returnBase64: z.boolean().nullish(),
			})
		)
		.query(async ({ ctx, input }) => {
			const { invoiceId, returnBase64: base64 } = input;

			const invoiceCaller = invoiceRouter.createCaller(ctx);
			const invoices = await invoiceCaller.byId({ id: invoiceId });

			if (!invoices) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const { pdfString } = await generatePDF(invoices);

			if (!pdfString) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			if (base64) {
				return `data:application/pdf;base64,${pdfString}`;
			}

			const pdfContent = Buffer.from(pdfString, "base64").toString();

			return pdfContent;
		}),
});
