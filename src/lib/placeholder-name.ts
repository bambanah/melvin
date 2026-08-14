/**
 * Placeholder for User.name (NOT NULL since #418) when there is no real name:
 * the email local-part, mirroring the migration backfill's
 * `split_part("email", '@', 1)`.
 */
export const placeholderName = (email: string) => email.split("@")[0];
