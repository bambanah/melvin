// @vitest-environment node
import prisma from "@/server/prisma";
import generatePDF, { renderInvoiceVersionPdf } from "@/lib/pdf-generation";
import { extractPdfText } from "@/lib/testing/pdf-test-utils";
import { invoiceVersionContentSchema } from "@/schema/invoice-version-schema";
import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "../server/api/test/harness";

beforeEach(async () => {
	await resetDb();
});

async function setupSentInvoice(
	user: Awaited<ReturnType<typeof createTestUser>>
) {
	const caller = callerFor(user);

	const client = await caller.clients.create({
		client: { name: "Jane Citizen", transitRatePerKm: "0.5" }
	});
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01_001_0125_6_1",
			weekdayRate: 100,
			ownerId: user.id
		}
	});
	const activity = await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0,
			transitDistance: "15",
			transitDuration: "30"
		}
	});
	const invoice = await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-STABLE",
			activityIds: [activity.id],
			activitiesToCreate: []
		}
	});

	await caller.invoice.send({ ids: [invoice.id] });

	return { caller, client, supportItem, activity, invoice };
}

test("clean render of a sent invoice is byte-stable across every upstream mutation (docs/plans/017 Step 6 headline)", async () => {
	const user = await createTestUser();
	const { supportItem, client, activity, invoice } =
		await setupSentInvoice(user);

	const before = await generatePDF(invoice.id, user.id);
	const textBefore = await extractPdfText(before.pdfString);
	expect(textBefore).toContain("$100.00/hr");

	await prisma.supportItem.update({
		where: { id: supportItem.id },
		data: { weekdayRate: 999 }
	});
	await prisma.client.update({
		where: { id: client.id },
		data: { transitRatePerKm: 5 }
	});
	await prisma.user.update({
		where: { id: user.id },
		data: { transitRatePerKm: 5, bankName: "Mutated Bank", bsb: 999999 }
	});
	await prisma.activity.update({
		where: { id: activity.id },
		data: {
			startTime: new Date("1970-01-01T05:00:00.000Z"),
			endTime: new Date("1970-01-01T09:00:00.000Z")
		}
	});

	const after = await generatePDF(invoice.id, user.id);
	const textAfter = await extractPdfText(after.pdfString);

	expect(textAfter).toEqual(textBefore);
	expect(textAfter).not.toContain("999.00");
	expect(textAfter).not.toContain("Mutated Bank");
});

test("a draft invoice's clean-looking render carries the DRAFT watermark and reads live data", async () => {
	const user = await createTestUser();
	const caller = callerFor(user);

	const client = await caller.clients.create({ client: { name: "Jane" } });
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01_001_0125_6_1",
			weekdayRate: 50,
			ownerId: user.id
		}
	});
	const activity = await caller.activity.add({
		activity: {
			clientId: client.id,
			supportItemId: supportItem.id,
			date: new Date("2024-01-01"),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});
	const invoice = await caller.invoice.create({
		invoice: {
			clientId: client.id,
			invoiceNo: "INV-DRAFT",
			activityIds: [activity.id],
			activitiesToCreate: []
		}
	});

	const { pdfString, fileName } = await generatePDF(invoice.id, user.id);
	const text = await extractPdfText(pdfString);

	expect(fileName).toBe("INV-DRAFT.pdf");
	expect(text).toContain("DRAFT");
	expect(text).toContain("$50.00/hr");

	await prisma.supportItem.update({
		where: { id: supportItem.id },
		data: { weekdayRate: 75 }
	});

	const { pdfString: pdfStringAfter } = await generatePDF(invoice.id, user.id);
	const textAfter = await extractPdfText(pdfStringAfter);

	// A draft has no frozen content — it's expected to reflect live data.
	expect(textAfter).toContain("$75.00/hr");
});

test("amend then re-send renders the v2 supersedes line and INV-1a filename", async () => {
	const user = await createTestUser();
	const { caller, invoice } = await setupSentInvoice(user);

	await caller.invoice.amend({ id: invoice.id });
	await caller.invoice.send({ ids: [invoice.id] });

	const { pdfString, fileName } = await generatePDF(invoice.id, user.id);
	const text = await extractPdfText(pdfString);

	expect(fileName).toBe("INV-STABLEa.pdf");
	expect(text).toContain("This invoice amends and supersedes INV-STABLE");

	const v1 = await generatePDF(invoice.id, user.id, { versionNumber: 1 });
	expect(v1.fileName).toBe("INV-STABLE.pdf");
	const v1Text = await extractPdfText(v1.pdfString);
	expect(v1Text).not.toContain("supersedes");
});

test("renderInvoiceVersionPdf parses stored content through the Zod schema", async () => {
	const user = await createTestUser();
	const { invoice } = await setupSentInvoice(user);

	const version = await prisma.invoiceVersion.findFirstOrThrow({
		where: { invoiceId: invoice.id, versionNumber: 1 }
	});
	const content = invoiceVersionContentSchema.parse(version.content);

	const { pdfString, fileName } = renderInvoiceVersionPdf(content);

	expect(fileName).toBe("INV-STABLE.pdf");
	expect(pdfString.length).toBeGreaterThan(0);
});

test("requesting a version number that doesn't exist returns no PDF", async () => {
	const user = await createTestUser();
	const { invoice } = await setupSentInvoice(user);

	const result = await generatePDF(invoice.id, user.id, { versionNumber: 7 });

	expect(result.fileName).toBeNull();
	expect(result.pdfString).toBe("");
});
