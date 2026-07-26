// The one-thumb field console - the shape the stage-2 HITL gate settled on
// (support-friend L2 "Capture"): the open Session fills the top of the
// screen with a live timer and big capture buttons; when nothing is running
// a single Start fills the same slot. The prototype's literal warm-paper hex
// tokens are translated to the theme system here (card/border/primary), so
// the console follows light and dark mode like the rest of the app.
import { Button } from "@/components/ui/button";
import { minutesSince, todayKey } from "@/lib/log/log-time";
import {
	costsOf,
	isGroupSession,
	sumAmounts,
	tripsOf,
	type LogSession
} from "@/lib/log/log-types";
import { useNowTick } from "@/hooks/use-log";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ClientAvatars } from "./client-avatars";
import type { LogFlows } from "./log-flows";
import { WarningNote } from "./warning-note";

/**
 * A two-line capture tile: what it captures on top, what has been captured (or
 * a hint) underneath. Wider than a Button's own shape - left-aligned, wrapping,
 * its own height - but built on it so focus, hover, and disabled behave like
 * every other button in the app.
 */
function CaptureTile({
	tone = "plain",
	label,
	hint,
	onClick
}: {
	tone?: "plain" | "primary";
	label: ReactNode;
	hint: ReactNode;
	onClick: () => void;
}) {
	const primary = tone === "primary";

	return (
		<Button
			variant="outline"
			className={cn(
				// justify-start so a tile whose hint wraps to two lines still lines
				// its label up with the tile beside it.
				"h-auto flex-col items-start justify-start gap-0.5 px-3 py-2.5 text-left whitespace-normal",
				primary
					? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
					: "bg-card"
			)}
			onClick={onClick}
		>
			<span className="text-sm font-medium">{label}</span>
			<span
				className={cn(
					"text-xs font-normal",
					primary ? "text-primary/70" : "text-muted-foreground"
				)}
			>
				{hint}
			</span>
		</Button>
	);
}

export function CaptureConsole({ flows }: { flows: LogFlows }) {
	const open = flows.log.openSession;

	if (!open) {
		return (
			<div className="border-primary/40 bg-card overflow-hidden rounded-xl border shadow-sm">
				<div className="from-primary/10 to-card bg-gradient-to-br p-5 text-center">
					<div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
						No Session running
					</div>
					<Button
						size="lg"
						className="mt-4 w-full font-semibold"
						onClick={() => flows.startSession()}
					>
						Start a Session
					</Button>
				</div>
			</div>
		);
	}

	return <Console flows={flows} session={open} />;
}

function Console({ flows, session }: { flows: LogFlows; session: LogSession }) {
	useNowTick();
	const { log } = flows;

	const stale = session.date !== todayKey();
	const minutes = stale ? null : minutesSince(session.startTime);
	const km = sumAmounts(tripsOf(session));
	const dollars = sumAmounts(costsOf(session));
	const isGroup = isGroupSession(session);
	const names = log.participantNameList(session);

	return (
		<div className="border-primary/40 bg-card overflow-hidden rounded-xl border shadow-sm">
			<div className="from-primary/10 to-card bg-gradient-to-br p-5 text-center">
				<div className="text-primary flex items-center justify-center gap-2 text-xs font-semibold tracking-wide uppercase">
					<span className="bg-primary inline-block size-2 animate-pulse rounded-full" />
					Session in progress
				</div>
				{minutes !== null && (
					<>
						<div className="text-primary mt-4 text-[56px] leading-none font-semibold tracking-tight tabular-nums">
							{Math.floor(minutes / 60)}:{String(minutes % 60).padStart(2, "0")}
						</div>
						<div className="text-muted-foreground mt-1 text-xs">elapsed</div>
					</>
				)}
				{/* Avatars above the names rather than beside them: a group's
				    names wrap to several lines, and a wrapped block beside the
				    avatars both spilled out of the centred row and left the
				    avatars floating against the middle of the text. */}
				<div className="mt-4 flex flex-col items-center gap-1.5">
					<ClientAvatars names={names} />
					<div className="min-w-0">
						<div className="text-base font-semibold break-words">
							{names.join(" + ")}
						</div>
						<div className="text-muted-foreground text-xs">
							{isGroup ? `Group of ${session.clientIds.length}` : "Solo"} ·
							started {session.startTime}
						</div>
					</div>
				</div>
				{/* Sessions left Open past their day close automatically at 23:59;
				    the one shape that can't (started in the day's final minute)
				    needs the edit sheet, so hand over rather than dead-ending. */}
				{stale && (
					<div className="mt-3 flex flex-col items-center gap-2">
						<WarningNote>
							Still open from {session.date} - Sessions can&apos;t cross
							midnight.
						</WarningNote>
						<Button
							variant="outline"
							size="sm"
							className="bg-card"
							onClick={() => flows.editSession(session)}
						>
							Edit Session
						</Button>
					</div>
				)}
			</div>

			<div className="border-border grid grid-cols-2 gap-2 border-t p-3">
				<CaptureTile
					label="+ Trip km"
					hint={km > 0 ? `${km} km logged` : "driving the client around"}
					onClick={() => flows.logTrip(session)}
				/>
				<CaptureTile
					label="+ Travel cost"
					hint={
						dollars > 0 ? `$${dollars.toFixed(2)} logged` : "parking, tolls..."
					}
					onClick={() => flows.logCost(session)}
				/>
			</div>

			<div className="border-border space-y-2 border-t p-3">
				{/* Handover starts the next Session; its follow-up dialog asks
				    whether there was a drive (Travel) or not (In-Place). Group
				    change is the other In-Place shape: a join/leave split of the
				    running Session. */}
				<div className="grid grid-cols-2 gap-2">
					<CaptureTile
						tone="primary"
						label="⇢ Handover"
						hint="next Client - add km if you drove"
						onClick={() => flows.startSession()}
					/>
					<CaptureTile
						tone="primary"
						label="⇄ Group change"
						hint="someone joins or leaves"
						onClick={() => flows.changeParticipants(session)}
					/>
				</div>
				<Button
					size="lg"
					className="w-full font-semibold"
					onClick={() => flows.endSession(session)}
				>
					End Session
				</Button>
			</div>
		</div>
	);
}
