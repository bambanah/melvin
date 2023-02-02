import { authedProcedure, router } from "@server/trpc";
import { TRPCError } from "@trpc/server";
import generatePDF from "@utils/pdf-generation";
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
				return new TRPCError({ code: "NOT_FOUND" });
			}

			const { pdfString, fileName } = await generatePDF(invoices);

			if (!pdfString) {
				return new TRPCError({ code: "NOT_FOUND" });
			}

			if (base64) {
				return `data:application/pdf;base64,${pdfString}`;
				// return response
				// 	.status(200)
				// 	.setHeader("Content-Type", "application/pdf")
				// 	.setHeader("Content-Disposition", `inline; filename="${fileName}"`)
				// 	.send(pdfString);
			}

			const pdfContent = Buffer.from(pdfString, "base64").toString();

			return pdfContent;
			// response.writeHead(200, {
			// 	"Content-Type": "application/pdf",
			// 	"Content-Length": pdfContent.length,
			// 	"Content-Disposition": `inline; filename="${fileName}"`,
			// });

			// response.end(pdfContent);
		}),
});
