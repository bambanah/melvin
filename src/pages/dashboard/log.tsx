// The Log tab: the field-capture console on top, the per-Client sections that
// mirror the notes-app habit below it, and the stack of days waiting to
// promote - the phone-first shape of issue #464 stage 3, shaped by the stage-2
// prototype verdict. Everything renders from the on-device store, so this page
// works identically with and without signal.
import { CaptureConsole } from "@/components/log/capture-console";
import { ClientAvatars } from "@/components/log/client-avatars";
import { useLogFlows, type LogFlows } from "@/components/log/log-flows";
import { SessionMeta } from "@/components/log/session-meta";
import { WarningNote } from "@/components/log/warning-note";
import Layout from "@/components/shared/layout";
import { Button } from "@/components/ui/button";
import { clearSyncError, dismissAutoEnded } from "@/lib/log/log-store";
import { formatDayKey, minutesBetween, todayKey } from "@/lib/log/log-time";
import type { LogSession } from "@/lib/log/log-types";
import { useLog, type ClientSection } from "@/hooks/use-log";
import { CloudOff, RefreshCw } from "lucide-react";
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

const plural = (count: number, word: string) =>
	`${count} ${word}${count === 1 ? "" : "s"}`;

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
				? `Syncing ${plural(pending, "capture")}...`
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
					<WarningNote>
						<span className="font-medium">{log.participantNames(session)}</span>{" "}
						was left open on {formatDayKey(session.date)} and ended for you at
						23:59 - is that when you finished?
					</WarningNote>
					<div className="mt-3 flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="bg-card flex-1"
							onClick={() => flows.editSession(session)}
						>
							Fix end time
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground flex-1"
							onClick={() => dismissAutoEnded(session.id)}
						>
							23:59 is right
						</Button>
					</div>
				</div>
			))}
		</section>
	);
}

/**
 * The Log's per-Client sections: one for every Client, holding that Client's
 * Sessions not yet turned into Activities. A section stays even when it is
 * empty - standing scaffolding for the Clients a Provider works with
 * regularly - and a group Session appears under each of its participants.
 */
function ClientSections({ flows }: { flows: LogFlows }) {
	const sections = flows.log.sessionsByClient;

	return (
		<section className="mt-8">
			<h2 className="mb-3 text-sm font-semibold">Sessions by Client</h2>
			{sections.length === 0 ? (
				<p className="text-muted-foreground border-border bg-card rounded-xl border px-4 py-3 text-sm italic shadow-sm">
					No Clients yet - add one under Clients and their section appears here.
				</p>
			) : (
				<div className="space-y-2.5">
					{sections.map((section) => (
						<ClientCard
							key={section.client.id}
							flows={flows}
							section={section}
						/>
					))}
				</div>
			)}
		</section>
	);
}

function ClientCard({
	flows,
	section
}: {
	flows: LogFlows;
	section: ClientSection;
}) {
	const { log } = flows;
	const { client, sessions } = section;
	// A Session still running has no hours yet - report the count alone rather
	// than a misleading "0h".
	const hours = dayHours(sessions);

	return (
		<div
			data-slot="log-client-section"
			className="border-border bg-card overflow-hidden rounded-xl border shadow-sm"
		>
			<div className="flex items-baseline justify-between gap-2 px-4 py-3">
				<h3 className="min-w-0 truncate text-sm font-semibold">
					{client.name}
				</h3>
				<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
					{sessions.length === 0
						? "no Sessions"
						: `${plural(sessions.length, "Session")}${
								hours === "0" ? "" : ` · ${hours}h`
							}`}
				</span>
			</div>
			{sessions.length > 0 && (
				<ul className="divide-border border-border divide-y border-t">
					{sessions.map((session) => (
						<li key={session.id}>
							<Button
								variant="ghost"
								className="h-auto w-full justify-start gap-3 rounded-none px-4 py-3 text-left font-normal"
								onClick={() => flows.editSession(session)}
							>
								<ClientAvatars names={log.participantNameList(session)} />
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium">
										{formatDayKey(session.date, "EEE d MMM")}
									</div>
									<div className="text-muted-foreground text-xs tabular-nums">
										{session.startTime} - {session.endTime ?? "open"}
										{session.handoverType === "TRAVEL" &&
											` · drove ${session.interClientDistance} km`}
									</div>
								</div>
								<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
									{session.endTime
										? `${formatHours(sessionMinutes(session))}h`
										: "running"}
								</span>
							</Button>
						</li>
					))}
				</ul>
			)}
		</div>
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
					Today promotes once its open Session ends - promotion is day-atomic.
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
					{plural(sessions.length, "Session")} · {dayHours(sessions)}h
				</div>
				{sessions.map((session) => (
					<SessionMeta key={session.id} session={session} />
				))}
			</div>
			<Button
				variant="outline"
				size="sm"
				className="bg-card text-secondary-foreground"
				onClick={() => flows.promoteDay(dateKey)}
			>
				Promote
			</Button>
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
				<ClientSections flows={flows} />
				<WaitingToPromote flows={flows} />
				<Button
					variant="ghost"
					className="text-muted-foreground mt-8 w-full"
					onClick={() => flows.editSession(null)}
				>
					+ Add a past Session
				</Button>
			</div>
			{flows.dialogs}
		</Layout>
	);
}

export default LogPage;
