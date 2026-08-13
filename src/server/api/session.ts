/**
 * The session shape every procedure, `ownedDb`, and the integration harness
 * read. better-auth nests the user under `{ session, user }`; normalizing here
 * keeps that difference out of the procedures.
 */
export interface AppSession {
	user: { id: string; email: string };
}

interface BetterAuthSession {
	user: { id: string; email: string };
}

export const toAppSession = (
	session: BetterAuthSession | null
): AppSession | null =>
	session && { user: { id: session.user.id, email: session.user.email } };
