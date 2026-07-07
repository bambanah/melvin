import prisma from "@/server/prisma";
import { TRPCError } from "@trpc/server";
import { beforeEach, expect, test } from "vitest";
import { ownedDb } from "./owned";
import { createTestUser, resetDb } from "./test/harness";

beforeEach(async () => {
	await resetDb();
});

test("assert throws NOT_FOUND for a foreign id", async () => {
	const owner = await createTestUser();
	const otherOwner = await createTestUser();

	const client = await prisma.client.create({
		data: { name: "Owner's client", ownerId: owner.id }
	});

	const asOwner = ownedDb(prisma, owner.id);
	const asOther = ownedDb(prisma, otherOwner.id);

	await expect(asOwner.client.assert(client.id)).resolves.toEqual({
		id: client.id
	});
	await expect(asOther.client.assert(client.id)).rejects.toThrow(TRPCError);
});
