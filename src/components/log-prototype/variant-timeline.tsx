// PROTOTYPE - throwaway. Variant "Timeline": day-first - one day at a time
// as a vertical time rail, handovers drawn as connectors between Session
// cards, and a sticky bottom action bar for capture. Day/chronology-first
// information hierarchy.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addDays, format } from "date-fns";
import {
	Car,
	ChevronLeft,
	ChevronRight,
	CircleDollarSign,
	MapPin,
	Play,
	Square,
	Undo2,
	Users
} from "lucide-react";
import { useState } from "react";
import type { LogFlows } from "./flows";
import { SessionMeta } from "./flows";
import {
	dayKey,
	elapsedMinutes,
	formatElapsed,
	minutesOfDay,
	participantNames,
	sessionTime,
	todayUtc,
	useNowTick,
	type LogSession
} from "./use-log-prototype";

export function VariantTimeline({ flows }: { flows: LogFlows }) {
	const { log } = flows;
	useNowTick();
	const [day, setDay] = useState(dayKey(todayUtc()));

	const sessions = log.sessionsByDay.get(day) ?? [];
	const isToday = day === dayKey(todayUtc());
	const hasOpen = sessions.some((s) => s.endTime === null);

	return (
		<div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-40">
			<div className="flex items-center justify-between">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setDay(dayKey(addDays(new Date(day), -1)))}
				>
					<ChevronLeft />
				</Button>
				<h1 className="font-display text-xl">
					{isToday ? "Today" : format(new Date(day), "EEEE d MMM")}
				</h1>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setDay(dayKey(addDays(new Date(day), 1)))}
				>
					<ChevronRight />
				</Button>
			</div>
			{!isToday && (
				<Button
					variant="ghost"
					size="sm"
					className="text-primary -mt-2 self-center"
					onClick={() => setDay(dayKey(todayUtc()))}
				>
					<Undo2 /> Back to today
				</Button>
			)}

			{sessions.length === 0 ? (
				<p className="text-muted-foreground py-12 text-center italic">
					Nothing captured this day.
				</p>
			) : (
				<ol className="flex flex-col">
					{sessions.map((session, index) => (
						<li key={session.id} className="flex flex-col">
							{index > 0 && (
								<Connector previous={sessions[index - 1]} session={session} />
							)}
							<TimelineCard flows={flows} session={session} />
						</li>
					))}
				</ol>
			)}

			{sessions.length > 0 && (
				<Button
					variant="outline"
					disabled={hasOpen}
					onClick={() => flows.promoteDay(day)}
				>
					{hasOpen ? "End the open Session to promote" : "Promote this day"}
				</Button>
			)}
			<Button
				variant="ghost"
				className="text-muted-foreground"
				onClick={() => flows.editSession(null)}
			>
				+ Add a past Session
			</Button>

			<ActionBar flows={flows} />
		</div>
	);
}

export function TimelineCard({
	flows,
	session
}: {
	flows: LogFlows;
	session: LogSession;
}) {
	const isOpen = session.endTime === null;
	return (
		<div
			className={
				isOpen
					? "border-primary bg-primary/10 rounded-xl border-2 p-4"
					: "border-border bg-card rounded-xl border p-4"
			}
		>
			<button
				className="flex w-full items-start justify-between gap-2 text-left"
				onClick={() => flows.editSession(session)}
			>
				<div>
					<p className="font-serif text-lg">{participantNames(session)}</p>
					<p className="text-muted-foreground font-mono text-sm">
						{sessionTime(session.startTime)}–
						{session.endTime ? sessionTime(session.endTime) : "now"}
						{isOpen && ` · ${formatElapsed(elapsedMinutes(session.startTime))}`}
					</p>
					<SessionMeta session={session} />
				</div>
				{isOpen && <Badge>open</Badge>}
			</button>
			{isOpen && (
				<div className="mt-3 flex gap-2">
					<Button
						variant="secondary"
						size="sm"
						onClick={() => flows.logTrip(session)}
					>
						<Car /> Trip
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => flows.logCost(session)}
					>
						<CircleDollarSign /> Travel cost
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => flows.changeParticipants(session)}
					>
						<Users />
					</Button>
				</div>
			)}
		</div>
	);
}

export function Connector({
	previous,
	session
}: {
	previous: LogSession;
	session: LogSession;
}) {
	const linked = session.precededByWorkSessionId === previous.id;
	const gap = previous.endTime
		? minutesOfDay(session.startTime) - minutesOfDay(previous.endTime)
		: null;

	let label: React.ReactNode;
	if (linked && session.handoverType === "TRAVEL") {
		label = (
			<>
				<Car className="size-3.5" /> {Number(session.interClientDistance)} km
				{session.interClientDuration !== null &&
					` · ${Number(session.interClientDuration)} min`}
			</>
		);
	} else if (linked && session.handoverType === "IN_PLACE") {
		label = (
			<>
				<MapPin className="size-3.5" /> stayed in place
			</>
		);
	} else {
		label = <>{gap !== null ? `${gap} min gap` : "gap"} · no drive logged</>;
	}

	return (
		<div className="text-muted-foreground flex items-center gap-2 py-1 pl-6 text-xs">
			<div className="border-border h-6 border-l border-dashed" />
			{label}
		</div>
	);
}

function ActionBar({ flows }: { flows: LogFlows }) {
	const open = flows.log.openSession;
	return (
		<div className="fixed inset-x-0 bottom-14 z-40 mx-auto w-full max-w-md px-4">
			{open ? (
				<div className="bg-foreground text-background flex items-center justify-between gap-2 rounded-full py-2 pr-2 pl-4 shadow-xl">
					<span className="truncate font-serif">{participantNames(open)}</span>
					<div className="flex shrink-0 gap-1">
						<Button
							variant="secondary"
							size="sm"
							onClick={() => flows.startSession()}
						>
							<Play /> Next
						</Button>
						<Button size="sm" onClick={() => flows.endSession(open)}>
							<Square /> End
						</Button>
					</div>
				</div>
			) : (
				<Button
					className="h-14 w-full rounded-full text-lg shadow-xl"
					onClick={() => flows.startSession()}
				>
					<Play /> Start a Session
				</Button>
			)}
		</div>
	);
}
