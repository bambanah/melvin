import { activitySchema } from "@/schema/activity-schema";

import { expect, test } from "vitest";

const base = {
	supportItemId: "support-item-1",
	clientId: "client-1",
	date: new Date("2026-07-08")
};

test("rejects end time before start time with the midnight message", () => {
	const result = activitySchema.safeParse({
		...base,
		startTime: "23:00",
		endTime: "01:00"
	});

	expect(result.success).toBe(false);
	if (!result.success) {
		const issue = result.error.issues.find(
			(i) => i.path.join(".") === "endTime"
		);
		expect(issue?.message).toBe(
			"End time must be after start time — activities can't cross midnight"
		);
	}
});

test("accepts ordered start and end times", () => {
	const result = activitySchema.safeParse({
		...base,
		startTime: "09:00",
		endTime: "17:00"
	});

	expect(result.success).toBe(true);
});

test("accepts the distance-only shape with no times", () => {
	const result = activitySchema.safeParse({
		...base,
		itemDistance: 12
	});

	expect(result.success).toBe(true);
});
