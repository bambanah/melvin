import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

const TEST_DB_NAME = "melvin_test";

function testDatabaseUrl(baseUrl: string): string {
	const url = new URL(baseUrl);
	url.pathname = `/${TEST_DB_NAME}`;
	return url.toString();
}

export default async function setup() {
	const baseUrl = process.env.DATABASE_URL;
	if (!baseUrl) {
		throw new Error(
			"DATABASE_URL is not set. Copy .env.template to .env before running integration tests."
		);
	}

	const testUrl = testDatabaseUrl(baseUrl);

	const adminUrl = new URL(testUrl);
	adminUrl.pathname = "/postgres";

	const admin = new Client({ connectionString: adminUrl.toString() });
	try {
		await admin.connect();
	} catch (error) {
		throw new Error(
			`Could not connect to Postgres — is \`pnpm db:up\` running? ${
				error instanceof Error ? error.message : String(error)
			}`
		);
	}

	const { rows } = await admin.query(
		"SELECT 1 FROM pg_database WHERE datname = $1",
		[TEST_DB_NAME]
	);
	if (rows.length === 0) {
		await admin.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
	}
	await admin.end();

	execSync("pnpm exec prisma db push", {
		env: { ...process.env, DATABASE_URL: testUrl },
		stdio: "inherit"
	});

	process.env.DATABASE_URL = testUrl;
}
