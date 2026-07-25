// The one-thumb field console - the shape the stage-2 HITL gate settled on
// (support-friend L2 "Capture"): the open Session fills the top of the
// screen with a live timer and big capture buttons; when nothing is running
// a single Start fills the same slot. The prototype's literal warm-paper hex
// tokens are translated to the theme system here (card/border/primary), so
// the console follows light and dark mode like the rest of the app.
import { minutesSince, todayKey } from "@/lib/log/log-time";
import {
	costsOf,
	isGroupSession,
	sumAmounts,
	tripsOf,
	type LogSession
} from "@/lib/log/log-types";
import { useNowTick } from "@/lib/log/use-log";
import { TriangleAlert } from "lucide-react";
import type { LogFlows } from "./log-flows";

export function ClientDot({ name }: { name: string }) {
	const initials = name
		.split(" ")
		.map((part) => part[0])
		.join("");
	return (
		<span className="bg-muted text-muted-foreground ring-border grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ring-1">
			{initials}
		</span>
	);
}

export function CaptureConsole({ flows }: { flows: LogFlows }) {
	const open = flows.log.openSession;

	if (!open) {
		return (
			<div className="border-primary/40 bg-card overflow-hidden rounded-xl border shadow-sm">
				<div className="from-primary/10 to-card bg-gradient-to-br p-5 text-center">
					<div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
						No session running
					</div>
					<button
						className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 w-full cursor-pointer rounded-lg px-3 py-3 text-sm font-semibold"
						onClick={() => flows.startSession()}
					>
						Start a session
					</button>
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
	const names = log.participantNames(session);

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
				<div className="mt-4 flex items-center justify-center gap-2.5">
					<ClientDot name={names} />
					<div className="text-left">
						<div className="text-base font-semibold">{names}</div>
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
						<p className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-500">
							<TriangleAlert className="size-4 shrink-0" />
							Still open from {session.date} - Sessions can&apos;t cross
							midnight.
						</p>
						<button
							className="border-border bg-card hover:bg-accent cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium"
							onClick={() => flows.editSession(session)}
						>
							Edit session
						</button>
					</div>
				)}
			</div>

			<div className="border-border grid grid-cols-2 gap-2 border-t p-3">
				<button
					className="border-border bg-card hover:bg-accent cursor-pointer rounded-lg border px-3 py-2.5 text-left"
					onClick={() => flows.logTrip(session)}
				>
					<div className="text-sm font-medium">+ Trip km</div>
					<div className="text-muted-foreground text-xs">
						{km > 0 ? `${km} km logged` : "driving the client around"}
					</div>
				</button>
				<button
					className="border-border bg-card hover:bg-accent cursor-pointer rounded-lg border px-3 py-2.5 text-left"
					onClick={() => flows.logCost(session)}
				>
					<div className="text-sm font-medium">+ Travel cost</div>
					<div className="text-muted-foreground text-xs">
						{dollars > 0 ? `$${dollars.toFixed(2)} logged` : "parking, tolls…"}
					</div>
				</button>
			</div>

			<div className="border-border space-y-2 border-t p-3">
				<div className="grid grid-cols-2 gap-2">
					<button
						className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer rounded-lg border px-3 py-2.5 text-sm font-medium"
						onClick={() => flows.startSession()}
					>
						⇢ Travel handover
					</button>
					<button
						className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer rounded-lg border px-3 py-2.5 text-sm font-medium"
						onClick={() => flows.changeParticipants(session)}
					>
						⇄ In-place handover
					</button>
				</div>
				<button
					className="bg-primary text-primary-foreground hover:bg-primary/90 w-full cursor-pointer rounded-lg px-3 py-3 text-sm font-semibold"
					onClick={() => flows.endSession(session)}
				>
					End session
				</button>
			</div>
		</div>
	);
}
