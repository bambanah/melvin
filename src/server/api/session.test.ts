import { describe, expect, it } from "vitest";
import { toAppSession } from "./session";

describe("toAppSession", () => {
	it("returns null when better-auth reports no session", () => {
		expect(toAppSession(null)).toBeNull();
	});

	it("flattens better-auth's { session, user } into the session shape procedures read", () => {
		expect(
			toAppSession({
				session: { expiresAt: new Date("2026-09-01T00:00:00.000Z") },
				user: { id: "user-1", email: "operator@example.com" }
			})
		).toEqual({
			user: { id: "user-1", email: "operator@example.com" },
			expires: "2026-09-01T00:00:00.000Z"
		});
	});
});
