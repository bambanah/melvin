import { appRouter } from "@/server/api/app-router";
import { createCallerFactory } from "@/server/api/trpc";
import type { User } from "@/generated/client";
import prisma from "@/server/prisma";

const createCaller = createCallerFactory(appRouter);

let userCounter = 0;

export async function createTestUser(name = "Test User"): Promise<User> {
	userCounter += 1;

	return prisma.user.create({
		data: {
			name,
			email: `test-user-${Date.now()}-${userCounter}@example.com`
		}
	});
}

export function callerFor(user: User) {
	return createCaller({
		prisma,
		session: {
			user: { id: user.id, email: user.email ?? "" },
			expires: "2999-01-01T00:00:00.000Z"
		}
	});
}

const APP_TABLES = [
	"ActivityTransportItem",
	"InterClientLeg",
	"Activity",
	"Trip",
	"SupportItemRates",
	"SupportItem",
	"Invoice",
	"Client",
	"Session",
	"Account",
	"VerificationToken",
	"User"
];

export async function resetDb(): Promise<void> {
	await prisma.$executeRawUnsafe(
		`TRUNCATE TABLE ${APP_TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`
	);
}
