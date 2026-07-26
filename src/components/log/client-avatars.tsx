// Who a Session is with, as circles: one avatar per participating Client.
// A group Session is a Session with several Clients, not a Client with a
// compound name - folding the whole group into one circle produced initials
// like "MCU+MMM", which read as a single person with a strange name. Names
// arrive with the honorifics and suffixes the Client record carries ("Mrs.",
// "MD"), so those are dropped before taking initials.

/** Dropped when taking initials: title and post-nominal parts, not names. */
const NON_NAME_PARTS = new Set([
	"mr",
	"mrs",
	"ms",
	"miss",
	"mx",
	"dr",
	"prof",
	"rev",
	"jr",
	"snr",
	"sr",
	"ii",
	"iii",
	"iv",
	"md",
	"phd",
	"dds",
	"dvm",
	"esq"
]);

/** Up to two letters: first + last name part ("Mrs. Ada Lovelace MD" → "AL"). */
export function clientInitials(name: string): string {
	const parts = name
		.split(/\s+/)
		.map((part) => part.replace(/[^\p{L}\p{N}]/gu, ""))
		.filter(
			(part) => part.length > 0 && !NON_NAME_PARTS.has(part.toLowerCase())
		);

	// Nothing but titles (or nothing at all): show whatever the name starts
	// with rather than an empty circle.
	if (parts.length === 0) {
		return name.trim().slice(0, 1).toUpperCase() || "?";
	}
	const letters =
		parts.length === 1
			? parts[0].slice(0, 1)
			: parts[0][0] + parts[parts.length - 1][0];
	return letters.toUpperCase();
}

const AVATAR =
	"bg-muted text-muted-foreground ring-border grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ring-1";

/** Past this many participants the tail collapses into a "+N" circle. */
const MAX_AVATARS = 3;

export function ClientAvatars({ names }: { names: string[] }) {
	const shown =
		names.length > MAX_AVATARS ? names.slice(0, MAX_AVATARS - 1) : names;
	const hidden = names.length - shown.length;

	return (
		<span className="flex shrink-0 items-center gap-1">
			{shown.map((name, index) => (
				<span key={`${index}-${name}`} className={AVATAR} title={name}>
					{clientInitials(name)}
				</span>
			))}
			{hidden > 0 && (
				<span className={AVATAR} title={names.slice(shown.length).join(", ")}>
					+{hidden}
				</span>
			)}
		</span>
	);
}
