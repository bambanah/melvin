import { describe, expect, test } from "vitest";
import { paginate } from "./owned";

describe("paginate", () => {
	test("returns all items and no cursor when under the limit", async () => {
		const items = [{ id: "1" }, { id: "2" }];

		const result = await paginate({
			limit: 5,
			query: async () => items
		});

		expect(result.items).toEqual(items);
		expect(result.nextCursor).toBeUndefined();
	});

	test("pops the extra row and returns its id as the next cursor when over the limit", async () => {
		const items = [{ id: "1" }, { id: "2" }, { id: "3" }];

		const result = await paginate({
			limit: 2,
			query: async () => items
		});

		expect(result.items).toEqual([{ id: "1" }, { id: "2" }]);
		expect(result.nextCursor).toBe("3");
	});

	test("requests take = limit + 1 and forwards the cursor", async () => {
		let receivedPage: { take: number; cursor?: { id: string } } | undefined;

		await paginate({
			limit: 10,
			cursor: "abc",
			query: async (page) => {
				receivedPage = page;
				return [];
			}
		});

		expect(receivedPage).toEqual({ take: 11, cursor: { id: "abc" } });
	});
});
