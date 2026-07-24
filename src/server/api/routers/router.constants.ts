// The server-side default page size when a list caller supplies no `limit`.
// Deliberately larger than `baseListQueryInput`'s max(100): that cap only
// bounds a client-*supplied* limit, whereas this default lets internal
// "fetch effectively all" callers (e.g. the invoice builder loading every
// unassigned activity for a client) get their full set in one round-trip.
export const DEFAULT_LIST_LIMIT = 1000;

// The Unbilled list is infinite-scrolled, so it pages in modest chunks rather
// than pulling everything at once.
export const DEFAULT_UNBILLED_PAGE_SIZE = 50;
