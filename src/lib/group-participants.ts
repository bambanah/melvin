import { MAX_ADDITIONAL_GROUP_PARTICIPANTS } from "@/schema/invoice-schema";

/**
 * The add/update/remove transforms for a group activity's "other participants"
 * list. Both participant editors — the quick-entry multi-activity form and the
 * invoice creation form — drive their `string[]` of client ids through these,
 * so the shape of the list (and the max-participant cap) lives in one place.
 * Each returns a new array; the caller owns where that value is persisted.
 */

/** Replace the participant client id at `index`. */
export const setParticipantAt = (
	ids: string[],
	index: number,
	clientId: string
): string[] => {
	const next = [...ids];
	next[index] = clientId;
	return next;
};

/** Append an empty participant slot, capped at the max additional participants. */
export const appendParticipant = (ids: string[]): string[] =>
	ids.length >= MAX_ADDITIONAL_GROUP_PARTICIPANTS ? ids : [...ids, ""];

/** Remove the participant at `index`. */
export const removeParticipantAt = (ids: string[], index: number): string[] =>
	ids.filter((_, i) => i !== index);
