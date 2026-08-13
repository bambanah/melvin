/**
 * The session shape every procedure, `ownedDb`, and the integration harness
 * read. better-auth returns `{ session, user }` where next-auth returned a
 * flat session; normalizing here keeps that difference out of all 49
 * procedures.
 */
export interface AppSession {
	user: { id: string; email: string };
	expires: string;
}

interface BetterAuthSession {
	session: { expiresAt: Date };
	user: { id: string; email: string };
}

export const toAppSession = (
	session: BetterAuthSession | null
): AppSession | null =>
	session && {
		user: { id: session.user.id, email: session.user.email },
		expires: session.session.expiresAt.toISOString()
	};
