// PROTOTYPE - throwaway. Variant "Notebook": mirrors the notes-app habit -
// per-Client sections are the page, with a sticky open-Session banner on top
// and a promote strip of day chips. Client-first information hierarchy.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Car, CircleDollarSign, Play, Square, Users } from "lucide-react";
import type { LogFlows } from "./flows";
import { SessionMeta } from "./flows";
import {
	elapsedMinutes,
	formatElapsed,
	participantNames,
	sessionTime,
	useNowTick,
	type LogSession
} from "./use-log-prototype";

export function VariantNotebook({ flows }: { flows: LogFlows }) {
	const { log } = flows;
	useNowTick();

	const days = [...log.sessionsByDay.keys()].sort();

	return (
		<div className="mx-auto flex w-full max-w-md flex-col gap-6 pb-24">
			<div className="flex items-baseline justify-between">
				<h1 className="font-display text-3xl">Log</h1>
				<div className="flex gap-2">
					<Button variant="ghost" onClick={() => flows.editSession(null)}>
						Backfill
					</Button>
					<Button onClick={() => flows.startSession()}>
						<Play /> Start
					</Button>
				</div>
			</div>

			{log.openSession && <OpenBanner flows={flows} />}

			{days.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{days.map((day) => (
						<button
							key={day}
							className="border-border hover:bg-accent flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
							onClick={() => flows.promoteDay(day)}
						>
							{format(new Date(day), "EEE d MMM")}
							<Badge variant="secondary">
								{log.sessionsByDay.get(day)?.length}
							</Badge>
						</button>
					))}
				</div>
			)}

			<div className="flex flex-col gap-6">
				{log.sections.map(({ client, sessions }) => (
					<section key={client.id}>
						<div className="border-border flex items-center justify-between border-b pb-1">
							<h2 className="font-serif text-xl">{client.name}</h2>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => flows.startSession([client.id])}
							>
								<Play /> Start
							</Button>
						</div>
						{sessions.length === 0 ? (
							<p className="text-muted-foreground py-2 text-sm italic">
								Nothing captured - section kept for next time.
							</p>
						) : (
							<ul>
								{sessions.map((session) => (
									<SessionRow
										key={session.id}
										session={session}
										onClick={() => flows.editSession(session)}
									/>
								))}
							</ul>
						)}
					</section>
				))}
			</div>
		</div>
	);
}

function OpenBanner({ flows }: { flows: LogFlows }) {
	const session = flows.log.openSession as LogSession;
	return (
		<div className="bg-primary text-primary-foreground sticky top-16 z-40 flex flex-col gap-3 rounded-xl p-4 shadow-lg">
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-2">
						<span className="relative flex size-2">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
							<span className="relative inline-flex size-2 rounded-full bg-white" />
						</span>
						<span className="font-serif text-lg">
							{participantNames(session)}
						</span>
					</div>
					<p className="text-sm opacity-80">
						since {sessionTime(session.startTime)} ·{" "}
						{formatElapsed(elapsedMinutes(session.startTime))}
					</p>
				</div>
				<Button
					variant="inverted"
					size="sm"
					onClick={() => flows.endSession(session)}
				>
					<Square /> End
				</Button>
			</div>
			<div className="flex gap-2">
				<Button
					variant="secondary"
					size="sm"
					className="flex-1"
					onClick={() => flows.logTrip(session)}
				>
					<Car /> Trip
				</Button>
				<Button
					variant="secondary"
					size="sm"
					className="flex-1"
					onClick={() => flows.logCost(session)}
				>
					<CircleDollarSign /> Travel cost
				</Button>
				<Button
					variant="secondary"
					size="sm"
					className="flex-1"
					onClick={() => flows.changeParticipants(session)}
				>
					<Users /> People
				</Button>
			</div>
		</div>
	);
}

function SessionRow({
	session,
	onClick
}: {
	session: LogSession;
	onClick: () => void;
}) {
	return (
		<li>
			<button
				className="hover:bg-accent flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left"
				onClick={onClick}
			>
				<div>
					<span className="font-mono text-sm">
						{format(new Date(session.date), "EEE d")} ·{" "}
						{sessionTime(session.startTime)}–
						{session.endTime ? sessionTime(session.endTime) : "…"}
					</span>
					<SessionMeta session={session} />
				</div>
				{session.endTime === null && <Badge>open</Badge>}
			</button>
		</li>
	);
}
