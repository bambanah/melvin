// PROTOTYPE - throwaway code for the stage-2 HITL gate of issue #464.
// The capture flows (start, end, handover, trip, cost, backfill/edit,
// participants, promote) shared by every variant. The flows are dictated by
// the log-router contract - the variants disagree about layout, not about
// what a capture step asks. Delete with the prototype.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle
} from "@/components/ui/sheet";
import { MAX_TRANSIT_DURATION_MINUTES } from "@/lib/trip-utils";
import { format } from "date-fns";
import { Car, CircleDollarSign, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
	dayKey,
	hhmmToMinutes,
	minutesOfDay,
	nowHHmm,
	participantNames,
	sessionTime,
	todayUtc,
	type LogPrototype,
	type LogSession
} from "./use-log-prototype";

const newId = () => crypto.randomUUID();

type HandoverPromptState = {
	sessionId: string;
	prevId: string;
	prevNames: string;
	newNames: string;
	gapMinutes: number;
};

export function useLogFlows(log: LogPrototype) {
	const [startState, setStartState] = useState<{
		prefillClientIds: string[];
	} | null>(null);
	const [endState, setEndState] = useState<LogSession | null>(null);
	const [handoverState, setHandoverState] =
		useState<HandoverPromptState | null>(null);
	const [tripState, setTripState] = useState<LogSession | null>(null);
	const [costState, setCostState] = useState<LogSession | null>(null);
	const [participantState, setParticipantState] = useState<LogSession | null>(
		null
	);
	const [editState, setEditState] = useState<{
		session: LogSession | null;
	} | null>(null);
	const [promoteState, setPromoteState] = useState<string | null>(null);

	return {
		log,
		startSession: (prefillClientIds: string[] = []) =>
			setStartState({ prefillClientIds }),
		endSession: (session: LogSession) => setEndState(session),
		logTrip: (session: LogSession) => setTripState(session),
		logCost: (session: LogSession) => setCostState(session),
		changeParticipants: (session: LogSession) => setParticipantState(session),
		editSession: (session: LogSession | null) => setEditState({ session }),
		promoteDay: (key: string) => setPromoteState(key),
		dialogs: (
			<>
				{startState && (
					<StartDialog
						log={log}
						prefillClientIds={startState.prefillClientIds}
						onClose={() => setStartState(null)}
						onHandover={setHandoverState}
					/>
				)}
				{endState && (
					<EndDialog
						log={log}
						session={endState}
						onClose={() => setEndState(null)}
					/>
				)}
				{handoverState && (
					<HandoverDialog
						log={log}
						state={handoverState}
						onClose={() => setHandoverState(null)}
					/>
				)}
				{tripState && (
					<TripDialog
						log={log}
						session={tripState}
						onClose={() => setTripState(null)}
					/>
				)}
				{costState && (
					<CostDialog
						log={log}
						session={costState}
						onClose={() => setCostState(null)}
					/>
				)}
				{participantState && (
					<ParticipantDialog
						log={log}
						session={participantState}
						onClose={() => setParticipantState(null)}
					/>
				)}
				{editState && (
					<EditSheet
						log={log}
						session={editState.session}
						onClose={() => setEditState(null)}
					/>
				)}
				{promoteState && (
					<PromoteDialog
						log={log}
						dateKey={promoteState}
						onClose={() => setPromoteState(null)}
					/>
				)}
			</>
		)
	};
}

export type LogFlows = ReturnType<typeof useLogFlows>;

const ErrorNote = ({ message }: { message?: string }) =>
	message ? <p className="text-destructive text-sm">{message}</p> : null;

function StartDialog({
	log,
	prefillClientIds,
	onClose,
	onHandover
}: {
	log: LogPrototype;
	prefillClientIds: string[];
	onClose: () => void;
	onHandover: (state: HandoverPromptState) => void;
}) {
	const [clientIds, setClientIds] = useState<string[]>(prefillClientIds);
	const [time, setTime] = useState(nowHHmm());
	const { start } = log.mutations;

	const today = todayUtc();
	// The Session the new Start hands over from: the open one (auto-closed at
	// this start time) or the latest already-closed Session earlier today.
	const previous =
		log.openSession ??
		[...log.allSessions]
			.reverse()
			.find(
				(s) =>
					dayKey(s.date) === dayKey(today) &&
					s.endTime !== null &&
					minutesOfDay(s.endTime) <= hhmmToMinutes(time)
			) ??
		null;

	const submit = async () => {
		const newNames = log.clients
			.filter((c) => clientIds.includes(c.id))
			.map((c) => c.name)
			.join(" + ");
		const created = await start.mutateAsync({
			date: today,
			startTime: time,
			clientIds
		});
		onClose();
		if (previous && created) {
			const gap = previous.endTime
				? hhmmToMinutes(time) - minutesOfDay(previous.endTime)
				: 0;
			onHandover({
				sessionId: created.id,
				prevId: previous.id,
				prevNames: participantNames(previous),
				newNames,
				gapMinutes: Math.max(gap, 0)
			});
		}
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Start a Session</DialogTitle>
					<DialogDescription>
						Who are you with? Times stamp active-with-client time only.
					</DialogDescription>
				</DialogHeader>
				<ClientPicker log={log} value={clientIds} onChange={setClientIds} />
				<div className="flex items-center gap-3">
					<Label htmlFor="start-time" className="shrink-0">
						Started at
					</Label>
					<Input
						id="start-time"
						type="time"
						value={time}
						onChange={(e) => setTime(e.target.value)}
					/>
				</div>
				{log.openSession && (
					<p className="text-muted-foreground text-sm">
						Your open Session with{" "}
						<span className="font-medium">
							{participantNames(log.openSession)}
						</span>{" "}
						will end at {time}.
					</p>
				)}
				<ErrorNote message={start.error?.message} />
				<Button
					disabled={clientIds.length === 0 || start.isPending}
					onClick={submit}
				>
					Start
				</Button>
			</DialogContent>
		</Dialog>
	);
}

function ClientPicker({
	log,
	value,
	onChange
}: {
	log: LogPrototype;
	value: string[];
	onChange: (ids: string[]) => void;
}) {
	return (
		<div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
			{log.clients.map((client) => (
				<label
					key={client.id}
					className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-2 py-2"
				>
					<Checkbox
						checked={value.includes(client.id)}
						onCheckedChange={(checked) =>
							onChange(
								checked
									? [...value, client.id]
									: value.filter((id) => id !== client.id)
							)
						}
					/>
					<span>{client.name}</span>
				</label>
			))}
		</div>
	);
}

function EndDialog({
	log,
	session,
	onClose
}: {
	log: LogPrototype;
	session: LogSession;
	onClose: () => void;
}) {
	const [time, setTime] = useState(nowHHmm());
	const { end } = log.mutations;

	const submit = async () => {
		await end.mutateAsync({ id: session.id, endTime: time });
		onClose();
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>End Session</DialogTitle>
					<DialogDescription>
						{participantNames(session)} · started{" "}
						{sessionTime(session.startTime)}
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center gap-3">
					<Label htmlFor="end-time" className="shrink-0">
						Finished at
					</Label>
					<Input
						id="end-time"
						type="time"
						value={time}
						onChange={(e) => setTime(e.target.value)}
					/>
				</div>
				<ErrorNote message={end.error?.message} />
				<div className="flex flex-col gap-2">
					<Button disabled={end.isPending} onClick={submit}>
						More clients to come
					</Button>
					<Button variant="secondary" disabled={end.isPending} onClick={submit}>
						Done for the day
					</Button>
				</div>
				<p className="text-muted-foreground text-xs">
					More to come? Starting the next Client will ask how far you drove.
				</p>
			</DialogContent>
		</Dialog>
	);
}

function HandoverDialog({
	log,
	state,
	onClose
}: {
	log: LogPrototype;
	state: HandoverPromptState;
	onClose: () => void;
}) {
	const defaultDuration = Math.min(
		state.gapMinutes,
		MAX_TRANSIT_DURATION_MINUTES
	);
	const [distance, setDistance] = useState("");
	const [duration, setDuration] = useState(String(defaultDuration));
	const { captureHandover } = log.mutations;

	const enteredDuration = Number(duration);
	const exceedsGap = enteredDuration > state.gapMinutes;

	const submit = async (handoverType: "TRAVEL" | "IN_PLACE") => {
		await captureHandover.mutateAsync({
			workSessionId: state.sessionId,
			precededByWorkSessionId: state.prevId,
			handoverType,
			interClientDistance:
				handoverType === "TRAVEL" ? Number(distance) : undefined,
			interClientDuration:
				handoverType === "TRAVEL" ? enteredDuration : undefined
		});
		onClose();
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>How did you get here?</DialogTitle>
					<DialogDescription>
						{state.prevNames} → {state.newNames} · {state.gapMinutes} min gap
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center gap-3">
					<Label htmlFor="handover-km" className="w-24 shrink-0">
						Drove (km)
					</Label>
					<Input
						id="handover-km"
						type="number"
						inputMode="decimal"
						min={0}
						value={distance}
						onChange={(e) => setDistance(e.target.value)}
						placeholder="e.g. 12.5"
					/>
				</div>
				<div className="flex items-center gap-3">
					<Label htmlFor="handover-min" className="w-24 shrink-0">
						Took (min)
					</Label>
					<Input
						id="handover-min"
						type="number"
						inputMode="numeric"
						min={0}
						value={duration}
						onChange={(e) => setDuration(e.target.value)}
					/>
				</div>
				{exceedsGap && (
					<p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
						<TriangleAlert className="size-4 shrink-0" />
						Longer than the {state.gapMinutes} min gap - only what fits will
						bill.
					</p>
				)}
				<ErrorNote message={captureHandover.error?.message} />
				<div className="flex flex-col gap-2">
					<Button
						disabled={!distance || captureHandover.isPending}
						onClick={() => submit("TRAVEL")}
					>
						<Car /> Log the drive
					</Button>
					<Button
						variant="secondary"
						disabled={captureHandover.isPending}
						onClick={() => submit("IN_PLACE")}
					>
						We stayed in place
					</Button>
					<Button variant="ghost" onClick={onClose}>
						Skip
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function TripDialog({
	log,
	session,
	onClose
}: {
	log: LogPrototype;
	session: LogSession;
	onClose: () => void;
}) {
	const [distance, setDistance] = useState("");
	const [note, setNote] = useState("");
	const { recordTrip } = log.mutations;

	const submit = async () => {
		await recordTrip.mutateAsync({
			workSessionId: session.id,
			distance: Number(distance),
			note: note || undefined
		});
		onClose();
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Log a trip</DialogTitle>
					<DialogDescription>
						Driving {participantNames(session)} around during the Session.
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center gap-3">
					<Label htmlFor="trip-km" className="w-20 shrink-0">
						Drove (km)
					</Label>
					<Input
						id="trip-km"
						type="number"
						inputMode="decimal"
						min={0}
						value={distance}
						onChange={(e) => setDistance(e.target.value)}
						placeholder="e.g. 8"
					/>
				</div>
				<Input
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="Note (optional)"
				/>
				<ErrorNote message={recordTrip.error?.message} />
				<Button disabled={!distance || recordTrip.isPending} onClick={submit}>
					<Car /> Log trip
				</Button>
			</DialogContent>
		</Dialog>
	);
}

function CostDialog({
	log,
	session,
	onClose
}: {
	log: LogPrototype;
	session: LogSession;
	onClose: () => void;
}) {
	const [type, setType] = useState<"PARKING" | "TOLL" | "OTHER">("PARKING");
	const [amount, setAmount] = useState("");
	const [note, setNote] = useState("");
	const { recordCost } = log.mutations;

	const submit = async () => {
		await recordCost.mutateAsync({
			workSessionId: session.id,
			type,
			amount: Number(amount),
			note: note || undefined
		});
		onClose();
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Log a travel cost</DialogTitle>
					<DialogDescription>
						Parking, a toll, or another travel-related expense.
					</DialogDescription>
				</DialogHeader>
				<Select value={type} onValueChange={(v) => setType(v as typeof type)}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="PARKING">Parking</SelectItem>
						<SelectItem value="TOLL">Toll</SelectItem>
						<SelectItem value="OTHER">Other</SelectItem>
					</SelectContent>
				</Select>
				<div className="flex items-center gap-3">
					<Label htmlFor="cost-amount" className="w-20 shrink-0">
						Cost ($)
					</Label>
					<Input
						id="cost-amount"
						type="number"
						inputMode="decimal"
						min={0}
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						placeholder="e.g. 4.50"
					/>
				</div>
				<Input
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="Note (optional)"
				/>
				<ErrorNote message={recordCost.error?.message} />
				<Button disabled={!amount || recordCost.isPending} onClick={submit}>
					<CircleDollarSign /> Log travel cost
				</Button>
			</DialogContent>
		</Dialog>
	);
}

function ParticipantDialog({
	log,
	session,
	onClose
}: {
	log: LogPrototype;
	session: LogSession;
	onClose: () => void;
}) {
	const [time, setTime] = useState(nowHHmm());
	const [joiningId, setJoiningId] = useState("");
	const { addParticipant, removeParticipant } = log.mutations;

	const memberIds = new Set(session.participants.map((p) => p.clientId));
	const candidates = log.clients.filter((c) => !memberIds.has(c.id));

	const add = async () => {
		await addParticipant.mutateAsync({
			workSessionId: session.id,
			clientId: joiningId,
			at: time
		});
		onClose();
	};
	const remove = async (clientId: string) => {
		await removeParticipant.mutateAsync({
			workSessionId: session.id,
			clientId,
			at: time
		});
		onClose();
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Who joined or left?</DialogTitle>
					<DialogDescription>
						The Session splits at this moment so each composition bills
						correctly.
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center gap-3">
					<Label htmlFor="pivot-time" className="shrink-0">
						At
					</Label>
					<Input
						id="pivot-time"
						type="time"
						value={time}
						onChange={(e) => setTime(e.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					{session.participants.map((p) => (
						<div
							key={p.clientId}
							className="flex items-center justify-between rounded-md px-2 py-1"
						>
							<span>{p.client.name}</span>
							<Button
								variant="outline"
								size="sm"
								disabled={
									session.participants.length <= 1 ||
									removeParticipant.isPending
								}
								onClick={() => remove(p.clientId)}
							>
								Leaves
							</Button>
						</div>
					))}
				</div>
				{candidates.length > 0 && (
					<div className="flex items-center gap-2">
						<Select value={joiningId} onValueChange={setJoiningId}>
							<SelectTrigger className="flex-1">
								<SelectValue placeholder="Someone joins..." />
							</SelectTrigger>
							<SelectContent>
								{candidates.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							size="sm"
							disabled={!joiningId || addParticipant.isPending}
							onClick={add}
						>
							Joins
						</Button>
					</div>
				)}
				<ErrorNote
					message={
						addParticipant.error?.message ?? removeParticipant.error?.message
					}
				/>
			</DialogContent>
		</Dialog>
	);
}

function EditSheet({
	log,
	session,
	onClose
}: {
	log: LogPrototype;
	session: LogSession | null;
	onClose: () => void;
}) {
	const [date, setDate] = useState(
		session ? dayKey(session.date) : dayKey(todayUtc())
	);
	const [startTime, setStartTime] = useState(
		session ? sessionTime(session.startTime) : "09:00"
	);
	const [endTime, setEndTime] = useState(
		session?.endTime ? sessionTime(session.endTime) : ""
	);
	const [clientIds, setClientIds] = useState<string[]>(
		session?.participants.map((p) => p.clientId) ?? []
	);
	const { edit, delete: deleteSession } = log.mutations;

	const submit = async () => {
		await edit.mutateAsync({
			id: session?.id ?? newId(),
			date: new Date(date),
			startTime,
			endTime: endTime || null,
			clientIds
		});
		onClose();
	};
	const remove = async () => {
		if (!session) return;
		await deleteSession.mutateAsync({ id: session.id });
		onClose();
	};

	return (
		<Sheet open onOpenChange={(open) => !open && onClose()}>
			<SheetContent side="bottom" className="flex flex-col gap-4">
				<SheetHeader>
					<SheetTitle>
						{session ? "Edit Session" : "Backfill a Session"}
					</SheetTitle>
				</SheetHeader>
				<div className="grid grid-cols-3 gap-2">
					<div className="col-span-3 flex items-center gap-3">
						<Label htmlFor="edit-date" className="w-16 shrink-0">
							Date
						</Label>
						<Input
							id="edit-date"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</div>
					<div className="col-span-3 flex items-center gap-3">
						<Label htmlFor="edit-start" className="w-16 shrink-0">
							Start
						</Label>
						<Input
							id="edit-start"
							type="time"
							value={startTime}
							onChange={(e) => setStartTime(e.target.value)}
						/>
						<Label htmlFor="edit-end" className="shrink-0">
							End
						</Label>
						<Input
							id="edit-end"
							type="time"
							value={endTime}
							onChange={(e) => setEndTime(e.target.value)}
						/>
					</div>
				</div>
				{!endTime && (
					<p className="text-muted-foreground text-xs">
						No end time keeps the Session Open.
					</p>
				)}
				<ClientPicker log={log} value={clientIds} onChange={setClientIds} />
				{session && session.transportItems.length > 0 && (
					<p className="text-muted-foreground text-xs">
						{session.transportItems.length} logged trip/cost item(s) kept as-is.
					</p>
				)}
				<ErrorNote
					message={edit.error?.message ?? deleteSession.error?.message}
				/>
				<div className="flex gap-2">
					{session && (
						<Button
							variant="destructive"
							disabled={deleteSession.isPending}
							onClick={remove}
						>
							Delete
						</Button>
					)}
					<Button
						className="flex-1"
						disabled={clientIds.length === 0 || edit.isPending}
						onClick={submit}
					>
						Save
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function PromoteDialog({
	log,
	dateKey: key,
	onClose
}: {
	log: LogPrototype;
	dateKey: string;
	onClose: () => void;
}) {
	const { promoteDay } = log.mutations;
	const sessions = log.sessionsByDay.get(key) ?? [];
	const hasOpen = sessions.some((s) => s.endTime === null);
	const result = promoteDay.data;

	const submit = async () => {
		await promoteDay.mutateAsync({ date: new Date(key) });
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) {
					promoteDay.reset();
					onClose();
				}
			}}
		>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>
						Promote {format(new Date(key), "EEEE d MMM")}
					</DialogTitle>
					<DialogDescription>
						Every Session becomes a Pending Activity and the day&apos;s drives
						become a Trip. The Log entries are consumed.
					</DialogDescription>
				</DialogHeader>
				{result ? (
					<div className="flex flex-col gap-3">
						<p className="text-sm">
							Created {result.activityIds.length} Activit
							{result.activityIds.length === 1 ? "y" : "ies"}
							{result.tripId ? " and a Trip" : ""}.
						</p>
						<Button asChild>
							<Link href="/dashboard/activities">View Activities</Link>
						</Button>
					</div>
				) : (
					<>
						<div className="flex flex-col gap-2">
							{sessions.map((session) => (
								<div
									key={session.id}
									className="border-border rounded-md border px-3 py-2 text-sm"
								>
									<div className="flex items-center justify-between">
										<span className="font-medium">
											{participantNames(session)}
										</span>
										<span className="text-muted-foreground font-mono text-xs">
											{sessionTime(session.startTime)}–
											{session.endTime ? (
												sessionTime(session.endTime)
											) : (
												<Badge variant="destructive">open</Badge>
											)}
										</span>
									</div>
									<SessionMeta session={session} />
								</div>
							))}
						</div>
						{hasOpen && (
							<p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
								<TriangleAlert className="size-4 shrink-0" />A Session is still
								Open - end it before promoting.
							</p>
						)}
						<ErrorNote message={promoteDay.error?.message} />
						<Button disabled={hasOpen || promoteDay.isPending} onClick={submit}>
							Promote day
						</Button>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

/** One-line summary of a Session's captured extras (group, trips, costs, handover). */
export function SessionMeta({ session }: { session: LogSession }) {
	const trips = session.transportItems.filter((i) => i.type === "DISTANCE");
	const costs = session.transportItems.filter((i) => i.type !== "DISTANCE");
	const parts: string[] = [];
	if (session.participants.length > 1) {
		parts.push(`group of ${session.participants.length}`);
	}
	if (trips.length > 0) {
		const km = trips.reduce((sum, t) => sum + Number(t.amount), 0);
		parts.push(`${km} km driven`);
	}
	if (costs.length > 0) {
		const total = costs.reduce((sum, c) => sum + Number(c.amount), 0);
		parts.push(`$${total.toFixed(2)} costs`);
	}
	if (session.handoverType === "TRAVEL") {
		parts.push(`arrived by ${Number(session.interClientDistance)} km drive`);
	}
	if (parts.length === 0) return null;
	return <p className="text-muted-foreground text-xs">{parts.join(" · ")}</p>;
}
