// PROTOTYPE - throwaway. Variant "Now": capture-first - the whole screen is
// the open Session (a giant live card with big-thumb actions); history is
// secondary, collapsed below. Moment-first information hierarchy.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Car, CircleDollarSign, Play, Square, Users } from "lucide-react";
import type { LogFlows } from "./flows";
import { SessionMeta } from "./flows";
import {
	dayKey,
	elapsedMinutes,
	participantNames,
	sessionTime,
	todayUtc,
	useNowTick,
	type LogSession
} from "./use-log-prototype";

export function VariantNow({ flows }: { flows: LogFlows }) {
	const { log } = flows;
	useNowTick();

	const today = dayKey(todayUtc());
	const todaySessions = log.sessionsByDay.get(today) ?? [];
	const earlierDays = [...log.sessionsByDay.keys()]
		.filter((day) => day !== today)
		.sort()
		.reverse();

	return (
		<div className="mx-auto flex w-full max-w-md flex-col gap-8 pb-24">
			{log.openSession ? (
				<NowCard flows={flows} session={log.openSession} />
			) : (
				<div className="flex flex-col gap-3 pt-8">
					<Button
						className="h-20 rounded-2xl text-xl"
						onClick={() => flows.startSession()}
					>
						<Play className="size-6!" /> Start
					</Button>
					{todaySessions.length > 0 && (
						<Button
							variant="secondary"
							className="h-12 rounded-2xl"
							onClick={() => flows.promoteDay(today)}
						>
							Wrap up the day ({todaySessions.length} Session
							{todaySessions.length === 1 ? "" : "s"})
						</Button>
					)}
				</div>
			)}

			<section>
				<h2 className="text-muted-foreground mb-2 text-sm font-medium tracking-wide uppercase">
					Today so far
				</h2>
				{todaySessions.length === 0 ? (
					<p className="text-muted-foreground text-sm italic">
						Nothing yet - tap Start when you begin.
					</p>
				) : (
					<CompactList flows={flows} sessions={todaySessions} />
				)}
			</section>

			{earlierDays.length > 0 && (
				<section>
					<h2 className="text-muted-foreground mb-2 text-sm font-medium tracking-wide uppercase">
						Earlier
					</h2>
					<div className="flex flex-col gap-4">
						{earlierDays.map((day) => (
							<div key={day}>
								<div className="flex items-center justify-between">
									<h3 className="font-serif">
										{format(new Date(day), "EEEE d MMM")}
									</h3>
									<Button
										variant="outline"
										size="sm"
										onClick={() => flows.promoteDay(day)}
									>
										Promote
									</Button>
								</div>
								<CompactList
									flows={flows}
									sessions={log.sessionsByDay.get(day) ?? []}
								/>
							</div>
						))}
					</div>
				</section>
			)}

			<Button
				variant="ghost"
				className="text-muted-foreground"
				onClick={() => flows.editSession(null)}
			>
				+ Backfill a Session
			</Button>
		</div>
	);
}

export function NowCard({
	flows,
	session
}: {
	flows: LogFlows;
	session: LogSession;
}) {
	const minutes = elapsedMinutes(session.startTime);
	return (
		<div className="border-primary/40 bg-primary/10 flex flex-col items-center gap-6 rounded-3xl border-2 p-6 pt-10 shadow-lg">
			<div className="text-center">
				<p className="font-serif text-2xl">{participantNames(session)}</p>
				<p className="text-muted-foreground text-sm">
					since {sessionTime(session.startTime)}
				</p>
			</div>
			<p className="text-primary font-mono text-6xl tabular-nums">
				{Math.floor(minutes / 60)}:{String(minutes % 60).padStart(2, "0")}
			</p>
			<div className="grid w-full grid-cols-2 gap-2">
				<Button
					variant="secondary"
					className="h-14"
					onClick={() => flows.logTrip(session)}
				>
					<Car /> Trip
				</Button>
				<Button
					variant="secondary"
					className="h-14"
					onClick={() => flows.logCost(session)}
				>
					<CircleDollarSign /> Travel cost
				</Button>
				<Button
					variant="secondary"
					className="h-14"
					onClick={() => flows.changeParticipants(session)}
				>
					<Users /> People
				</Button>
				<Button className="h-14" onClick={() => flows.endSession(session)}>
					<Square /> End
				</Button>
			</div>
			{session.transportItems.length > 0 && (
				<p className="text-muted-foreground text-xs">
					{session.transportItems.length} trip/cost item
					{session.transportItems.length === 1 ? "" : "s"} logged
				</p>
			)}
		</div>
	);
}

function CompactList({
	flows,
	sessions
}: {
	flows: LogFlows;
	sessions: LogSession[];
}) {
	return (
		<ul className="flex flex-col">
			{sessions.map((session) => (
				<li key={session.id}>
					<button
						className="hover:bg-accent flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left"
						onClick={() => flows.editSession(session)}
					>
						<div className="min-w-0">
							<p className="truncate">
								<span className="font-mono text-sm">
									{sessionTime(session.startTime)}–
									{session.endTime ? sessionTime(session.endTime) : "…"}
								</span>{" "}
								<span className="font-serif">{participantNames(session)}</span>
							</p>
							<SessionMeta session={session} />
						</div>
						{session.endTime === null && <Badge>open</Badge>}
					</button>
				</li>
			))}
		</ul>
	);
}
