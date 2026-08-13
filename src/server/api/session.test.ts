import { describe, expect, it } from "vitest";
import { toAppSession } from "./session";

describe("toAppSession", () => {
	it("returns null when better-auth reports no session", () => {
		expect(toAppSession(null)).toBeNull();
	});

	it("flattens better-auth's nested user into the shape procedures read", () => {
		expect(
			toAppSession({ user: { id: "user-1", email: "operator@example.com" } })
		).toEqual({ user: { id: "user-1", email: "operator@example.com" } });
	});
});
