import prisma from "@/server/prisma";
import { beforeEach, expect, test } from "vitest";
import { callerFor, createTestUser, resetDb } from "./harness";

beforeEach(async () => {
	await resetDb();
});

/** Every fixture invoice is dated in FY 24-25, which the query asks for. */
const FINANCIAL_YEAR = 2024;
const INVOICE_DATE = new Date("2024-08-01");

async function setupProvider(name: string) {
	const user = await createTestUser(name);
	const caller = callerFor(user);

	const client = await caller.clients.create({
		client: { name: `${name}'s client` }
	});
	const supportItem = await prisma.supportItem.create({
		data: {
			description: "Support",
			weekdayCode: "01_001_0125_6_1",
			weekdayRate: 100,
			ownerId: user.id
		}
	});

	return { user, caller, client, supportItem };
}

/** A one-hour activity at $100/hr, so each one adds exactly $100 to a total. */
async function addHourActivity(
	caller: ReturnType<typeof callerFor>,
	clientId: string,
	supportItemId: string,
	date: string
) {
	return caller.activity.add({
		activity: {
			clientId,
			supportItemId,
			date: new Date(date),
			startTime: "09:00",
			endTime: "10:00",
			itemDistance: 0
		}
	});
}

async function createInvoice(
	caller: ReturnType<typeof callerFor>,
	clientId: string,
	invoiceNo: string,
	activityIds: string[]
) {
	return caller.invoice.create({
		invoice: {
			clientId,
			invoiceNo,
			date: INVOICE_DATE,
			activityIds,
			activitiesToCreate: []
		}
	});
}

async function setupSentInvoice(providerName: string) {
	const provider = await setupProvider(providerName);
	const activity = await addHourActivity(
		provider.caller,
		provider.client.id,
		provider.supportItem.id,
		"2024-08-01"
	);
	const invoice = await createInvoice(
		provider.caller,
		provider.client.id,
		`INV-${providerName}`,
		[activity.id]
	);
	await provider.caller.invoice.send({ ids: [invoice.id] });

	return { ...provider, invoice };
}

test("excludes another provider's sent invoices", async () => {
	const mine = await setupSentInvoice("Mine");
	await setupSentInvoice("Theirs");

	const report = await mine.caller.report.billing({
		financialYear: FINANCIAL_YEAR
	});

	expect(report.totalBilled).toBe(100);
	expect(report.invoiceCount).toBe(1);
	expect(report.clients.map((row) => row.clientName)).toEqual([
		"Mine's client"
	]);
});

test("excludes draft invoices", async () => {
	const { caller, client, supportItem } = await setupProvider("Solo");

	const sentActivity = await addHourActivity(
		caller,
		client.id,
		supportItem.id,
		"2024-08-01"
	);
	const sent = await createInvoice(caller, client.id, "INV-SENT", [
		sentActivity.id
	]);
	await caller.invoice.send({ ids: [sent.id] });

	const draftActivity = await addHourActivity(
		caller,
		client.id,
		supportItem.id,
		"2024-08-02"
	);
	await createInvoice(caller, client.id, "INV-DRAFT", [draftActivity.id]);

	const report = await caller.report.billing({
		financialYear: FINANCIAL_YEAR
	});

	expect(report.totalBilled).toBe(100);
	expect(report.invoiceCount).toBe(1);
});

test("counts an amended invoice once, at its latest version's total", async () => {
	const { caller, client, supportItem } = await setupProvider("Solo");

	const first = await addHourActivity(
		caller,
		client.id,
		supportItem.id,
		"2024-08-01"
	);
	const second = await addHourActivity(
		caller,
		client.id,
		supportItem.id,
		"2024-08-02"
	);
	const invoice = await createInvoice(caller, client.id, "INV-AMEND", [
		first.id,
		second.id
	]);

	await caller.invoice.send({ ids: [invoice.id] });
	await caller.invoice.amend({ id: invoice.id });
	await caller.activity.delete({ id: second.id });
	await caller.invoice.send({ ids: [invoice.id] });

	const report = await caller.report.billing({
		financialYear: FINANCIAL_YEAR
	});

	expect(report.totalBilled).toBe(100);
	expect(report.invoiceCount).toBe(1);
});
