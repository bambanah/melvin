// The global open-Session banner: while a Session is running, every
// dashboard screen shows who it's with and how long it's been going, and
// lets the Provider log a trip, log a travel cost, or end it without
// hunting for the Log tab. Hidden on the Log tab itself, where the capture
// console is the banner.
import { formatMinutes, minutesSince, todayKey } from "@/lib/log/log-time";
import { useLog, useNowTick } from "@/lib/log/use-log";
import { Car, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useLogFlows } from "./log-flows";

export function OpenSessionBanner() {
	const router = useRouter();
	const log = useLog();
	const flows = useLogFlows(log);
	useNowTick();

	const session = log.openSession;
	if (!session || router.pathname === "/dashboard/log") return null;

	const stale = session.date !== todayKey();
	const elapsed = stale
		? `since ${session.date}`
		: formatMinutes(minutesSince(session.startTime));

	return (
		<>
			<div className="border-primary/40 bg-primary/10 sticky top-14 z-40 w-full border-b">
				<div className="mx-auto flex h-11 max-w-5xl items-center gap-3 px-2 sm:px-12">
					<span className="bg-primary inline-block size-2 shrink-0 animate-pulse rounded-full" />
					<Link
						href="/dashboard/log"
						className="min-w-0 flex-1 truncate text-sm"
					>
						<span className="font-medium">{log.participantNames(session)}</span>{" "}
						<span className="text-muted-foreground tabular-nums">
							· {elapsed}
						</span>
					</Link>
					{/* Icon-only on phones so the Client and elapsed time stay
					    readable; the dialogs they open are fully labelled. */}
					<button
						aria-label="Log trip km"
						className="text-primary hover:bg-primary/20 flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
						onClick={() => flows.logTrip(session)}
					>
						<Car className="size-4" />
						<span className="hidden sm:inline">+ Trip km</span>
					</button>
					<button
						aria-label="Log travel cost"
						className="text-primary hover:bg-primary/20 flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
						onClick={() => flows.logCost(session)}
					>
						<CircleDollarSign className="size-4" />
						<span className="hidden sm:inline">+ Travel cost</span>
					</button>
					<button
						className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold"
						onClick={() => flows.endSession(session)}
					>
						End
					</button>
				</div>
			</div>
			{flows.dialogs}
		</>
	);
}
