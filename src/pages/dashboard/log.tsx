// The Log tab: the field-capture console on top, today's captured Sessions
// below it, and the stack of days waiting to promote - the phone-first
// mirror of the notes-app habit (issue #464 stage 3, shaped by the stage-2
// prototype verdict). Everything renders from the on-device store, so this
// page works identically with and without signal.
import { CaptureConsole, ClientDot } from "@/components/log/capture-console";
import { useLogFlows, type LogFlows } from "@/components/log/log-flows";
import { SessionMeta } from "@/components/log/session-meta";
import Layout from "@/components/shared/layout";
import { clearSyncError, dismissAutoEnded } from "@/lib/log/log-store";
import { formatDayKey, minutesBetween, todayKey } from "@/lib/log/log-time";
import type { LogSession } from "@/lib/log/log-types";
import { useLog } from "@/lib/log/use-log";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import Head from "next/head";
import { useEffect } from "react";
import { toast } from "react-toastify";

const sessionMinutes = (session: LogSession) =>
	session.endTime ? minutesBetween(session.startTime, session.endTime) : 0;

const formatHours = (minutes: number) =>
	(minutes / 60).toFixed(1).replace(/\.0$/, "");

const dayHours = (sessions: LogSession[]) =>
	formatHours(
		sessions.reduce((sum, session) => sum + sessionMinutes(session), 0)
	);

function SyncStatus({ online, pending }: { online: boolean; pending: number }) {
	if (online && pending === 0) return null;

	return (
		<p className="text-muted-foreground mb-3 flex items-center gap-2 text-xs">
			{online ? (
				<RefreshCw className="size-3.5 shrink-0" />
			) : (
				<CloudOff className="size-3.5 shrink-0" />
			)}
			{online
				? `Syncing ${pending} capture${pending === 1 ? "" : "s"}...`
				: `Offline - captures are saved on this device${
						pending > 0 ? ` (${pending} waiting to sync)` : ""
					} and sync when you're back in signal.`}
		</p>
	);
}

// Story: nudge when a Session was left Open - the store ended it at 23:59
// (the day-boundary rule, not when the Provider actually stopped), so keep
// asking until the end time is fixed or confirmed.
function AutoEndNudge({ flows }: { flows: LogFlows }) {
	const { log } = flows;
	const nudged = log.sessions.filter((session) =>
		log.autoEnded.includes(session.id)
	);
	if (nudged.length === 0) return null;

	return (
		<section className="mt-4 space-y-2.5">
			{nudged.map((session) => (
				<div
					key={session.id}
					className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
				>
					<p className="flex items-start gap-2 text-sm">
						<TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
						<span>
							<span className="font-medium">
								{log.participantNames(session)}
							</span>{" "}
							was left open on {formatDayKey(session.date)} and ended for you at
							23:59 - is that when you finished?
						</span>
					</p>
					<div className="mt-3 flex gap-2">
						<button
							className="border-border bg-card hover:bg-accent flex-1 cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium"
							onClick={() => flows.editSession(session)}
						>
							Fix end time
						</button>
						<button
							className="text-muted-foreground hover:bg-accent flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-sm"
							onClick={() => dismissAutoEnded(session.id)}
						>
							23:59 is right
						</button>
					</div>
				</div>
			))}
		</section>
	);
}

function EarlierToday({ flows }: { flows: LogFlows }) {
	const { log } = flows;
	const earlier = (log.sessionsByDay.get(todayKey()) ?? []).filter(
		(session) => session.endTime !== null
	);

	return (
		<section className="mt-8">
			<div className="mb-3 flex items-baseline justify-between">
				<h2 className="text-sm font-semibold">Earlier today</h2>
				<span className="text-muted-foreground text-xs">
					{dayHours(earlier)}h so far
				</span>
			</div>
			<div className="border-border bg-card rounded-xl border shadow-sm">
				{earlier.length === 0 ? (
					<p className="text-muted-foreground px-4 py-3 text-sm italic">
						Nothing captured yet today.
					</p>
				) : (
					<ul className="divide-border divide-y">
						{earlier.map((session) => (
							<li key={session.id}>
								<button
									className="hover:bg-accent flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
									onClick={() => flows.editSession(session)}
								>
									<ClientDot name={log.participantNames(session)} />
									<div className="min-w-0 flex-1">
										<div className="truncate text-sm font-medium">
											{log.participantNames(session)}
										</div>
										<div className="text-muted-foreground text-xs tabular-nums">
											{session.startTime} - {session.endTime}
											{session.handoverType === "TRAVEL" &&
												` · drove ${session.interClientDistance} km`}
										</div>
									</div>
									<span className="text-muted-foreground text-xs tabular-nums">
										{formatHours(sessionMinutes(session))}h
									</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}

function WaitingToPromote({ flows }: { flows: LogFlows }) {
	const { log } = flows;
	const today = todayKey();
	const todayClosed = (log.sessionsByDay.get(today) ?? []).filter(
		(session) => session.endTime !== null
	);
	const previousDays = [...log.sessionsByDay.keys()]
		.filter((day) => day !== today)
		.sort()
		.reverse();

	return (
		<section className="mt-8">
			<h2 className="mb-3 text-sm font-semibold">Waiting to promote</h2>
			<div className="space-y-2.5">
				{!log.openSession && todayClosed.length > 0 && (
					<PromoteDayCard
						flows={flows}
						label="Today"
						dateKey={today}
						sessions={todayClosed}
					/>
				)}
				{previousDays.map((day) => (
					<PromoteDayCard
						key={day}
						flows={flows}
						label={formatDayKey(day)}
						dateKey={day}
						sessions={log.sessionsByDay.get(day) ?? []}
					/>
				))}
			</div>
			{log.openSession && (
				<p className="text-muted-foreground mt-3 text-xs">
					Today promotes once its open session ends - promotion is day-atomic.
				</p>
			)}
		</section>
	);
}

function PromoteDayCard({
	flows,
	label,
	dateKey,
	sessions
}: {
	flows: LogFlows;
	label: string;
	dateKey: string;
	sessions: LogSession[];
}) {
	return (
		<div className="border-border bg-card flex items-center gap-3 rounded-xl border p-4 shadow-sm">
			<div className="min-w-0 flex-1">
				<div className="text-sm font-medium">{label}</div>
				<div className="text-muted-foreground truncate text-xs">
					{sessions.length} session{sessions.length === 1 ? "" : "s"} ·{" "}
					{dayHours(sessions)}h
				</div>
				{sessions.map((session) => (
					<SessionMeta key={session.id} session={session} />
				))}
			</div>
			<button
				className="border-border bg-card text-secondary-foreground hover:bg-accent cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium"
				onClick={() => flows.promoteDay(dateKey)}
			>
				Promote
			</button>
		</div>
	);
}

function LogPage() {
	const log = useLog();
	const flows = useLogFlows(log);

	// A capture the server refused was dropped from the queue; tell the
	// Provider why so they can re-enter it correctly.
	useEffect(() => {
		if (log.lastSyncError) {
			toast.warn(`A capture didn't sync: ${log.lastSyncError}`);
			clearSyncError();
		}
	}, [log.lastSyncError]);

	return (
		<Layout>
			<Head>
				<title>Log - Melvin</title>
			</Head>
			<div className="mx-auto w-full max-w-md pb-24">
				<SyncStatus online={log.online} pending={log.queue.length} />
				{log.hydrated && <CaptureConsole flows={flows} />}
				<AutoEndNudge flows={flows} />
				<EarlierToday flows={flows} />
				<WaitingToPromote flows={flows} />
				<button
					className="text-muted-foreground hover:bg-accent mt-8 w-full cursor-pointer rounded-lg px-3 py-2 text-sm"
					onClick={() => flows.editSession(null)}
				>
					+ Add a past session
				</button>
			</div>
			{flows.dialogs}
		</Layout>
	);
}

export default LogPage;
