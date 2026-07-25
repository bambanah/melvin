// PROTOTYPE - throwaway. Variant "Capture": port of the support-friend
// design session's round-3 winner candidate L2 "Capture" (a one-thumb field
// console) wired to the real log-router. Keeps L2's warm-paper design tokens
// as literal values (light-mode only, like the source prototype); the open
// session is the whole top of the screen, history is secondary below.
//
// Contract mapping: L2's "travel handover" exit starts the next Client (our
// backend captures the handover at next Start), and "in-place handover" is
// the participant join/leave split.
import { format } from "date-fns";
import type { LogFlows } from "./flows";
import {
	dayKey,
	elapsedMinutes,
	minutesOfDay,
	participantNames,
	sessionTime,
	todayUtc,
	useNowTick,
	type LogSession
} from "./use-log-prototype";

const sessionHours = (session: LogSession) =>
	session.endTime
		? ((minutesOfDay(session.endTime) - minutesOfDay(session.startTime)) / 60)
				.toFixed(1)
				.replace(/\.0$/, "")
		: null;

const dayHours = (sessions: LogSession[]) =>
	(
		sessions.reduce(
			(sum, s) =>
				sum +
				(s.endTime ? minutesOfDay(s.endTime) - minutesOfDay(s.startTime) : 0),
			0
		) / 60
	)
		.toFixed(1)
		.replace(/\.0$/, "");

function ClientDot({ name }: { name: string }) {
	const initials = name
		.split(" ")
		.map((part) => part[0])
		.join("");
	return (
		<span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f9f9f7] text-[10px] font-semibold text-[#52514e] ring-1 ring-[#e1e0d9]">
			{initials}
		</span>
	);
}

export function VariantCapture({ flows }: { flows: LogFlows }) {
	const { log } = flows;
	useNowTick();

	const today = dayKey(todayUtc());
	const todaySessions = log.sessionsByDay.get(today) ?? [];
	const earlierToday = todaySessions.filter((s) => s.endTime !== null);
	const previousDays = [...log.sessionsByDay.keys()]
		.filter((day) => day !== today)
		.sort()
		.reverse();
	const open = log.openSession;

	return (
		<div className="mx-auto w-full max-w-md pb-24 text-[#0b0b0b]">
			{open ? (
				<Console flows={flows} session={open} />
			) : (
				<div className="overflow-hidden rounded-xl border border-[#f7cdb8] bg-[#fcfcfb] shadow-[0_1px_2px_rgba(11,11,11,0.04)]">
					<div className="bg-gradient-to-br from-[#fdefe7] to-[#fcfcfb] p-5 text-center">
						<div className="text-xs font-semibold tracking-wide text-[#898781] uppercase">
							No session running
						</div>
						<button
							className="mt-4 w-full cursor-pointer rounded-lg bg-[#d9541f] px-3 py-3 text-sm font-semibold text-white hover:bg-[#a8431a]"
							onClick={() => flows.startSession()}
						>
							Start a session
						</button>
					</div>
				</div>
			)}

			<section className="mt-8">
				<div className="mb-3 flex items-baseline justify-between">
					<h2 className="text-sm font-semibold">Earlier today</h2>
					<span className="text-xs text-[#898781]">
						{dayHours(earlierToday)}h so far
					</span>
				</div>
				<div className="rounded-xl border border-[#e1e0d9] bg-[#fcfcfb] shadow-[0_1px_2px_rgba(11,11,11,0.04)]">
					{earlierToday.length === 0 ? (
						<p className="px-4 py-3 text-sm text-[#898781] italic">
							Nothing captured yet today.
						</p>
					) : (
						<ul className="divide-y divide-[#e1e0d9]">
							{earlierToday.map((session) => (
								<li key={session.id}>
									<button
										className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-[#f9f9f7]"
										onClick={() => flows.editSession(session)}
									>
										<ClientDot name={session.participants[0].client.name} />
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-medium">
												{participantNames(session)}
											</div>
											<div className="text-xs text-[#898781] tabular-nums">
												{sessionTime(session.startTime)} -{" "}
												{session.endTime && sessionTime(session.endTime)}
												{session.handoverType === "TRAVEL" &&
													` · drove ${Number(session.interClientDistance)} km`}
											</div>
										</div>
										<span className="text-xs text-[#898781] tabular-nums">
											{sessionHours(session)}h
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</section>

			<section className="mt-8">
				<h2 className="mb-3 text-sm font-semibold">Waiting to promote</h2>
				<div className="space-y-2.5">
					{!open && earlierToday.length > 0 && (
						<PromoteDayCard
							flows={flows}
							label="Today"
							dayKeyValue={today}
							sessions={earlierToday}
						/>
					)}
					{previousDays.map((day) => (
						<PromoteDayCard
							key={day}
							flows={flows}
							label={format(new Date(day), "EEEE d MMM")}
							dayKeyValue={day}
							sessions={log.sessionsByDay.get(day) ?? []}
						/>
					))}
				</div>
				{open && (
					<p className="mt-3 text-xs text-[#898781]">
						Today promotes once its open session ends - promotion is day-atomic.
					</p>
				)}
			</section>

			<button
				className="mt-8 w-full cursor-pointer rounded-lg px-3 py-2 text-sm text-[#898781] hover:bg-[#f9f9f7]"
				onClick={() => flows.editSession(null)}
			>
				+ Add a past session
			</button>
		</div>
	);
}

function Console({ flows, session }: { flows: LogFlows; session: LogSession }) {
	const minutes = elapsedMinutes(session.startTime);
	const trips = session.transportItems.filter((i) => i.type === "DISTANCE");
	const costs = session.transportItems.filter((i) => i.type !== "DISTANCE");
	const km = trips.reduce((sum, t) => sum + Number(t.amount), 0);
	const dollars = costs.reduce((sum, c) => sum + Number(c.amount), 0);
	const isGroup = session.participants.length > 1;

	return (
		<div className="overflow-hidden rounded-xl border border-[#f7cdb8] bg-[#fcfcfb] shadow-[0_1px_2px_rgba(11,11,11,0.04)]">
			<div className="bg-gradient-to-br from-[#fdefe7] to-[#fcfcfb] p-5 text-center">
				<div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-wide text-[#a8431a] uppercase">
					<span className="inline-block size-2 animate-pulse rounded-full bg-[#e8632c]" />
					Session in progress
				</div>
				<div className="mt-4 text-[56px] leading-none font-semibold tracking-tight text-[#a8431a] tabular-nums">
					{Math.floor(minutes / 60)}:{String(minutes % 60).padStart(2, "0")}
				</div>
				<div className="mt-1 text-xs text-[#898781]">elapsed</div>
				<div className="mt-4 flex items-center justify-center gap-2.5">
					<ClientDot name={session.participants[0].client.name} />
					<div className="text-left">
						<div className="text-base font-semibold">
							{participantNames(session)}
						</div>
						<div className="text-xs text-[#52514e]">
							{isGroup ? `Group of ${session.participants.length}` : "Solo"} ·
							started {sessionTime(session.startTime)}
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2 border-t border-[#e1e0d9] p-3">
				<button
					className="cursor-pointer rounded-lg border border-[#e1e0d9] bg-[#fcfcfb] px-3 py-2.5 text-left hover:bg-[#f9f9f7]"
					onClick={() => flows.logTrip(session)}
				>
					<div className="text-sm font-medium">+ Trip km</div>
					<div className="text-xs text-[#898781]">
						{km > 0 ? `${km} km logged` : "driving the client around"}
					</div>
				</button>
				<button
					className="cursor-pointer rounded-lg border border-[#e1e0d9] bg-[#fcfcfb] px-3 py-2.5 text-left hover:bg-[#f9f9f7]"
					onClick={() => flows.logCost(session)}
				>
					<div className="text-sm font-medium">+ Travel cost</div>
					<div className="text-xs text-[#898781]">
						{dollars > 0 ? `$${dollars.toFixed(2)} logged` : "parking, tolls…"}
					</div>
				</button>
			</div>

			<div className="space-y-2 border-t border-[#e1e0d9] p-3">
				<div className="grid grid-cols-2 gap-2">
					<button
						className="cursor-pointer rounded-lg border border-[#f7cdb8] bg-[#fdefe7] px-3 py-2.5 text-sm font-medium text-[#a8431a] hover:bg-[#f7cdb8]/50"
						onClick={() => flows.startSession()}
					>
						⇢ Travel handover
					</button>
					<button
						className="cursor-pointer rounded-lg border border-[#f7cdb8] bg-[#fdefe7] px-3 py-2.5 text-sm font-medium text-[#a8431a] hover:bg-[#f7cdb8]/50"
						onClick={() => flows.changeParticipants(session)}
					>
						⇄ In-place handover
					</button>
				</div>
				<button
					className="w-full cursor-pointer rounded-lg bg-[#d9541f] px-3 py-3 text-sm font-semibold text-white hover:bg-[#a8431a]"
					onClick={() => flows.endSession(session)}
				>
					End session
				</button>
			</div>
		</div>
	);
}

function PromoteDayCard({
	flows,
	label,
	dayKeyValue,
	sessions
}: {
	flows: LogFlows;
	label: string;
	dayKeyValue: string;
	sessions: LogSession[];
}) {
	return (
		<div className="flex items-center gap-3 rounded-xl border border-[#e1e0d9] bg-[#fcfcfb] p-4 shadow-[0_1px_2px_rgba(11,11,11,0.04)]">
			<div className="min-w-0 flex-1">
				<div className="text-sm font-medium">{label}</div>
				<div className="truncate text-xs text-[#898781]">
					{sessions.length} session{sessions.length === 1 ? "" : "s"} ·{" "}
					{dayHours(sessions)}h
				</div>
			</div>
			<button
				className="cursor-pointer rounded-lg border border-[#e1e0d9] bg-[#fcfcfb] px-3 py-1.5 text-sm font-medium text-[#52514e] hover:bg-[#f9f9f7] hover:text-[#0b0b0b]"
				onClick={() => flows.promoteDay(dayKeyValue)}
			>
				Promote
			</button>
		</div>
	);
}
