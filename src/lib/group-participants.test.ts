import {
	appendParticipant,
	removeParticipantAt,
	setParticipantAt
} from "@/lib/group-participants";
import { MAX_ADDITIONAL_GROUP_PARTICIPANTS } from "@/schema/invoice-schema";
import { expect, test } from "vitest";

test("setParticipantAt replaces the id at the given index", () => {
	expect(setParticipantAt(["a", "b", "c"], 1, "x")).toEqual(["a", "x", "c"]);
});

test("setParticipantAt does not mutate the input array", () => {
	const original = ["a", "b", "c"];
	setParticipantAt(original, 1, "x");
	expect(original).toEqual(["a", "b", "c"]);
});

test("appendParticipant adds an empty slot", () => {
	expect(appendParticipant(["a"])).toEqual(["a", ""]);
});

test("appendParticipant appends to an empty list", () => {
	expect(appendParticipant([])).toEqual([""]);
});

test("appendParticipant is a no-op at the participant cap", () => {
	const atCap = Array.from(
		{ length: MAX_ADDITIONAL_GROUP_PARTICIPANTS },
		(_, i) => `id-${i}`
	);
	expect(appendParticipant(atCap)).toBe(atCap);
});

test("appendParticipant is a no-op past the cap", () => {
	const overCap = Array.from(
		{ length: MAX_ADDITIONAL_GROUP_PARTICIPANTS + 1 },
		(_, i) => `id-${i}`
	);
	expect(appendParticipant(overCap)).toBe(overCap);
});

test("removeParticipantAt removes the id at a middle index", () => {
	expect(removeParticipantAt(["a", "b", "c"], 1)).toEqual(["a", "c"]);
});

test("removeParticipantAt handles the first index", () => {
	expect(removeParticipantAt(["a", "b", "c"], 0)).toEqual(["b", "c"]);
});

test("removeParticipantAt handles the last index", () => {
	expect(removeParticipantAt(["a", "b", "c"], 2)).toEqual(["a", "b"]);
});

test("removeParticipantAt is a no-op for an out-of-range index and returns a copy", () => {
	const original = ["a", "b", "c"];
	const result = removeParticipantAt(original, 5);
	expect(result).toEqual(["a", "b", "c"]);
	expect(result).not.toBe(original);
});
