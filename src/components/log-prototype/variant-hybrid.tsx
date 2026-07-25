// PROTOTYPE - throwaway. Variant "Hybrid": the Now card from the "now"
// variant as the open-Session state, sitting on top of the "timeline"
// variant's day rail. The card is the present, the rail is the day so far.
import { Button } from "@/components/ui/button";
import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight, Play, Undo2 } from "lucide-react";
import { useState } from "react";
import type { LogFlows } from "./flows";
import { Connector, TimelineCard } from "./variant-timeline";
import { NowCard } from "./variant-now";
import {
	dayKey,
	todayUtc,
	useNowTick,
	type LogSession
} from "./use-log-prototype";

export function VariantHybrid({ flows }: { flows: LogFlows }) {
	const { log } = flows;
	useNowTick();
	const [day, setDay] = useState(dayKey(todayUtc()));

	const isToday = day === dayKey(todayUtc());
	const daySessions = log.sessionsByDay.get(day) ?? [];
	// The Now card owns the open Session; the rail shows the day's closed ones.
	const railSessions = isToday
		? daySessions.filter((s) => s.endTime !== null)
		: daySessions;
	const hasOpen = daySessions.some((s) => s.endTime === null);

	return (
		<div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-24">
			{/* The Now card is the present, not part of the browsed day - it stays
			    put while the rail below navigates through history. */}
			{log.openSession ? (
				<NowCard flows={flows} session={log.openSession} />
			) : (
				isToday && (
					<Button
						className="h-20 rounded-2xl text-xl"
						onClick={() => flows.startSession()}
					>
						<Play className="size-6!" /> Start
					</Button>
				)
			)}

			<div className="flex items-center justify-between">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setDay(dayKey(addDays(new Date(day), -1)))}
				>
					<ChevronLeft />
				</Button>
				<h2 className="font-display text-lg">
					{isToday ? "Today so far" : format(new Date(day), "EEEE d MMM")}
				</h2>
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
					className="text-primary -mt-3 self-center"
					onClick={() => setDay(dayKey(todayUtc()))}
				>
					<Undo2 /> Back to today
				</Button>
			)}

			{railSessions.length === 0 ? (
				<p className="text-muted-foreground py-8 text-center italic">
					Nothing captured this day.
				</p>
			) : (
				<ol className="flex flex-col">
					{railSessions.map((session, index) => (
						<li key={session.id} className="flex flex-col">
							{index > 0 && (
								<Connector
									previous={railSessions[index - 1]}
									session={session}
								/>
							)}
							<TimelineCard flows={flows} session={session} />
						</li>
					))}
					{isToday && log.openSession && railSessions.length > 0 && (
						<li>
							<Connector
								previous={railSessions[railSessions.length - 1]}
								session={log.openSession as LogSession}
							/>
							<p className="text-muted-foreground pl-6 text-xs italic">
								…continues in the card above
							</p>
						</li>
					)}
				</ol>
			)}

			{daySessions.length > 0 && (
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
		</div>
	);
}
