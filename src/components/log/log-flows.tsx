// The Log's capture flows: start, end, handover-at-next-start, trip, cost,
// participant split, and backfill/edit. Each dialog applies its capture to
// the on-device store synchronously (offline-first - the store queues the
// server replay), so a tap lands instantly with or without signal. The store
// enforces the router's rules at tap time; dialogs surface its message inline.
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle
} from "@/components/ui/responsive-dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { defaultTravelDuration } from "@/lib/log-utils";
import {
	captureHandover,
	changeParticipants,
	deleteSession,
	editSession,
	endSession,
	getLogState,
	recordCost,
	recordTrip,
	startSession
} from "@/lib/log/log-store";
import { minutesBetween, nowHHmm, todayKey } from "@/lib/log/log-time";
import type { LogSession, LogTransportItem } from "@/lib/log/log-types";
import type { Log } from "@/hooks/use-log";
import { Car, CircleDollarSign, X } from "lucide-react";
import { useState } from "react";
import { PromoteDialog } from "./promote-dialog";
import { WarningNote } from "./warning-note";

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : "Something went wrong";

type HandoverPromptState = {
	sessionId: string;
	prevId: string;
	prevNames: string;
	newNames: string;
	gapMinutes: number;
};

export function useLogFlows(log: Log) {
	const [startState, setStartState] = useState(false);
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
		startSession: () => setStartState(true),
		endSession: (session: LogSession) => setEndState(session),
		logTrip: (session: LogSession) => setTripState(session),
		logCost: (session: LogSession) => setCostState(session),
		changeParticipants: (session: LogSession) => setParticipantState(session),
		editSession: (session: LogSession | null) => setEditState({ session }),
		promoteDay: (dateKey: string) => setPromoteState(dateKey),
		dialogs: (
			<>
				{startState && (
					<StartDialog
						log={log}
						onClose={() => setStartState(false)}
						onHandover={setHandoverState}
					/>
				)}
				{endState && (
					<EndDialog
						session={endState}
						onClose={() => setEndState(null)}
						onMoreToCome={() => setStartState(true)}
					/>
				)}
				{handoverState && (
					<HandoverDialog
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
					<CostDialog session={costState} onClose={() => setCostState(null)} />
				)}
				{participantState && (
					<ParticipantDialog
						log={log}
						session={participantState}
						onClose={() => setParticipantState(null)}
					/>
				)}
				{editState && (
					<EditDialog
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

const ErrorNote = ({ message }: { message: string | null }) =>
	message ? <p className="text-destructive text-sm">{message}</p> : null;

function ClientPicker({
	log,
	value,
	onChange
}: {
	log: Log;
	value: string[];
	onChange: (ids: string[]) => void;
}) {
	if (log.clients.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No Clients yet - add one under Clients (this list fills from your Melvin
				Clients when you&apos;re online).
			</p>
		);
	}

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

function StartDialog({
	log,
	onClose,
	onHandover
}: {
	log: Log;
	onClose: () => void;
	onHandover: (state: HandoverPromptState) => void;
}) {
	const [clientIds, setClientIds] = useState<string[]>([]);
	const [time, setTime] = useState(nowHHmm());
	const [error, setError] = useState<string | null>(null);

	const submit = () => {
		try {
			const { session, previous } = startSession({
				clientIds,
				startTime: time
			});
			onClose();
			// Both stamped times are known the moment the next Session starts -
			// this is when the inter-client drive is captured.
			if (previous) {
				onHandover({
					sessionId: session.id,
					prevId: previous.id,
					prevNames: log.participantNames(previous),
					newNames: log.participantNames(session),
					gapMinutes: previous.endTime
						? Math.max(minutesBetween(previous.endTime, time), 0)
						: 0
				});
			}
		} catch (submitError) {
			setError(errorMessage(submitError));
		}
	};

	return (
		<ResponsiveDialog open onOpenChange={(open) => !open && onClose()}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Start a Session</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Who are you with? Times stamp active-with-client time only.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<ClientPicker log={log} value={clientIds} onChange={setClientIds} />
				<div className="flex items-center gap-3">
					<Label htmlFor="start-time" className="shrink-0">
						Started at
					</Label>
					<Input
						id="start-time"
						type="time"
						value={time}
						onChange={(event) => setTime(event.target.value)}
					/>
				</div>
				{log.openSession && (
					<p className="text-muted-foreground text-sm">
						Your open Session with{" "}
						<span className="font-medium">
							{log.participantNames(log.openSession)}
						</span>{" "}
						will end at {time}.
					</p>
				)}
				<ErrorNote message={error} />
				<Button disabled={clientIds.length === 0} onClick={submit}>
					Start
				</Button>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

function EndDialog({
	session,
	onClose,
	onMoreToCome
}: {
	session: LogSession;
	onClose: () => void;
	onMoreToCome: () => void;
}) {
	const [time, setTime] = useState(nowHHmm());
	const [error, setError] = useState<string | null>(null);

	const submit = (moreToCome: boolean) => {
		try {
			endSession(session.id, time);
			onClose();
			// "More to come" chains straight into starting the next Client, whose
			// Start captures the handover drive - no extra navigation (story 8).
			if (moreToCome) onMoreToCome();
		} catch (submitError) {
			setError(errorMessage(submitError));
		}
	};

	return (
		<ResponsiveDialog open onOpenChange={(open) => !open && onClose()}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>End Session</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Started {session.startTime}
						{session.date !== todayKey() && ` on ${session.date}`}.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<div className="flex items-center gap-3">
					<Label htmlFor="end-time" className="shrink-0">
						Finished at
					</Label>
					<Input
						id="end-time"
						type="time"
						value={time}
						onChange={(event) => setTime(event.target.value)}
					/>
				</div>
				<ErrorNote message={error} />
				<div className="flex flex-col gap-2">
					<Button onClick={() => submit(true)}>More clients to come</Button>
					<Button variant="secondary" onClick={() => submit(false)}>
						Done for the day
					</Button>
				</div>
				<p className="text-muted-foreground text-xs">
					More to come? You&apos;ll pick the next Client straight away, and
					starting them asks how far you drove.
				</p>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

function HandoverDialog({
	state,
	onClose
}: {
	state: HandoverPromptState;
	onClose: () => void;
}) {
	const [distance, setDistance] = useState("");
	const [duration, setDuration] = useState(
		String(defaultTravelDuration(state.gapMinutes))
	);
	const [error, setError] = useState<string | null>(null);

	const enteredDuration = Number(duration);
	const exceedsGap = enteredDuration > state.gapMinutes;

	const submit = (handoverType: "TRAVEL" | "IN_PLACE") => {
		try {
			captureHandover({
				workSessionId: state.sessionId,
				precededByWorkSessionId: state.prevId,
				handoverType,
				interClientDistance:
					handoverType === "TRAVEL" ? Number(distance) : undefined,
				interClientDuration:
					handoverType === "TRAVEL" ? enteredDuration : undefined
			});
			onClose();
		} catch (submitError) {
			// The dialog can't be dismissed, so the one unanswerable failure -
			// the Session vanished mid-prompt (a concurrent delete syncing in) -
			// must let go rather than trap the Provider behind a dead error.
			if (
				!getLogState().sessions.some(
					(session) => session.id === state.sessionId
				)
			) {
				onClose();
				return;
			}
			setError(errorMessage(submitError));
		}
	};

	return (
		// Not dismissible: whether you drove is exactly what Promotion bills, so
		// the question can't be swiped away - it never comes back (the prompt
		// only fires at next-Start) and a silent gap would just underbill.
		<ResponsiveDialog open dismissible={false}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>How did you get here?</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{state.prevNames} → {state.newNames} · {state.gapMinutes} min gap
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
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
						onChange={(event) => setDistance(event.target.value)}
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
						onChange={(event) => setDuration(event.target.value)}
					/>
				</div>
				{exceedsGap && (
					<WarningNote>
						Longer than the {state.gapMinutes} min gap - only what fits will
						bill.
					</WarningNote>
				)}
				<ErrorNote message={error} />
				<div className="flex flex-col gap-2">
					<Button disabled={!distance} onClick={() => submit("TRAVEL")}>
						<Car /> Log the drive
					</Button>
					<Button variant="secondary" onClick={() => submit("IN_PLACE")}>
						We stayed in place
					</Button>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

function TripDialog({
	log,
	session,
	onClose
}: {
	log: Log;
	session: LogSession;
	onClose: () => void;
}) {
	const [distance, setDistance] = useState("");
	const [note, setNote] = useState("");
	const [error, setError] = useState<string | null>(null);

	const submit = () => {
		try {
			recordTrip({
				workSessionId: session.id,
				distance: Number(distance),
				note: note || undefined
			});
			onClose();
		} catch (submitError) {
			setError(errorMessage(submitError));
		}
	};

	return (
		<ResponsiveDialog open onOpenChange={(open) => !open && onClose()}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Log a trip</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Driving {log.participantNames(session)} around during the Session.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
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
						onChange={(event) => setDistance(event.target.value)}
						placeholder="e.g. 8"
					/>
				</div>
				<Input
					value={note}
					onChange={(event) => setNote(event.target.value)}
					placeholder="Note (optional)"
				/>
				<ErrorNote message={error} />
				<Button disabled={!distance} onClick={submit}>
					<Car /> Log trip
				</Button>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

function CostDialog({
	session,
	onClose
}: {
	session: LogSession;
	onClose: () => void;
}) {
	const [type, setType] = useState<"PARKING" | "TOLL" | "OTHER">("PARKING");
	const [amount, setAmount] = useState("");
	const [note, setNote] = useState("");
	const [error, setError] = useState<string | null>(null);

	const submit = () => {
		try {
			recordCost({
				workSessionId: session.id,
				type,
				amount: Number(amount),
				note: note || undefined
			});
			onClose();
		} catch (submitError) {
			setError(errorMessage(submitError));
		}
	};

	return (
		<ResponsiveDialog open onOpenChange={(open) => !open && onClose()}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Log a travel cost</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Parking, a toll, or another travel-related expense.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<Select
					value={type}
					onValueChange={(value) => setType(value as typeof type)}
				>
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
						onChange={(event) => setAmount(event.target.value)}
						placeholder="e.g. 4.50"
					/>
				</div>
				<Input
					value={note}
					onChange={(event) => setNote(event.target.value)}
					placeholder="Note (optional)"
				/>
				<ErrorNote message={error} />
				<Button disabled={!amount} onClick={submit}>
					<CircleDollarSign /> Log travel cost
				</Button>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

function ParticipantDialog({
	log,
	session,
	onClose
}: {
	log: Log;
	session: LogSession;
	onClose: () => void;
}) {
	const [time, setTime] = useState(nowHHmm());
	const [joiningId, setJoiningId] = useState("");
	const [error, setError] = useState<string | null>(null);

	const memberIds = new Set(session.clientIds);
	const candidates = log.clients.filter((client) => !memberIds.has(client.id));

	const change = (clientId: string, kind: "add" | "remove") => {
		try {
			changeParticipants({
				workSessionId: session.id,
				clientId,
				at: time,
				change: kind
			});
			onClose();
		} catch (submitError) {
			setError(errorMessage(submitError));
		}
	};

	return (
		<ResponsiveDialog open onOpenChange={(open) => !open && onClose()}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Who joined or left?</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						The Session splits at this moment so each composition bills
						correctly.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<div className="flex items-center gap-3">
					<Label htmlFor="pivot-time" className="shrink-0">
						At
					</Label>
					<Input
						id="pivot-time"
						type="time"
						value={time}
						onChange={(event) => setTime(event.target.value)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					{session.clientIds.map((clientId) => (
						<div
							key={clientId}
							className="flex items-center justify-between gap-2 rounded-md px-2 py-1"
						>
							<span className="min-w-0 break-words">
								{log.clientName(clientId)}
							</span>
							<Button
								className="shrink-0"
								variant="outline"
								size="sm"
								disabled={session.clientIds.length <= 1}
								onClick={() => change(clientId, "remove")}
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
								{candidates.map((client) => (
									<SelectItem key={client.id} value={client.id}>
										{client.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							size="sm"
							disabled={!joiningId}
							onClick={() => change(joiningId, "add")}
						>
							Joins
						</Button>
					</div>
				)}
				<ErrorNote message={error} />
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

function EditDialog({
	log,
	session,
	onClose
}: {
	log: Log;
	session: LogSession | null;
	onClose: () => void;
}) {
	const [date, setDate] = useState(session?.date ?? todayKey());
	const [startTime, setStartTime] = useState(session?.startTime ?? "09:00");
	const [endTime, setEndTime] = useState(session?.endTime ?? "");
	const [clientIds, setClientIds] = useState<string[]>(
		session?.clientIds ?? []
	);
	const [items, setItems] = useState<LogTransportItem[]>(
		session?.transportItems ?? []
	);
	const [itemsChanged, setItemsChanged] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const removeItem = (id: string) => {
		setItems((current) => current.filter((item) => item.id !== id));
		setItemsChanged(true);
	};

	const submit = () => {
		try {
			editSession({
				id: session?.id ?? null,
				date,
				startTime,
				endTime: endTime || null,
				clientIds,
				// Only replace the captured trips and costs when one was removed -
				// otherwise the sync replay leaves them untouched.
				transportItems: itemsChanged ? items : undefined
			});
			onClose();
		} catch (submitError) {
			setError(errorMessage(submitError));
		}
	};

	const remove = () => {
		if (!session) return;
		deleteSession(session.id);
		onClose();
	};

	return (
		<ResponsiveDialog open onOpenChange={(open) => !open && onClose()}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>
						{session ? "Edit Session" : "Backfill a Session"}
					</ResponsiveDialogTitle>
				</ResponsiveDialogHeader>
				<div className="flex items-center gap-3">
					<Label htmlFor="edit-date" className="w-16 shrink-0">
						Date
					</Label>
					<Input
						id="edit-date"
						type="date"
						value={date}
						onChange={(event) => setDate(event.target.value)}
					/>
				</div>
				{/* Two time inputs plus their labels don't fit a phone row - one
				    field per line, matching Date above. */}
				<div className="flex items-center gap-3">
					<Label htmlFor="edit-start" className="w-16 shrink-0">
						Start
					</Label>
					<Input
						id="edit-start"
						type="time"
						value={startTime}
						onChange={(event) => setStartTime(event.target.value)}
					/>
				</div>
				<div className="flex items-center gap-3">
					<Label htmlFor="edit-end" className="w-16 shrink-0">
						End
					</Label>
					<Input
						id="edit-end"
						type="time"
						value={endTime}
						onChange={(event) => setEndTime(event.target.value)}
					/>
				</div>
				{!endTime && (
					<p className="text-muted-foreground text-xs">
						No end time keeps the Session Open.
					</p>
				)}
				<ClientPicker log={log} value={clientIds} onChange={setClientIds} />
				{items.length > 0 && (
					<div className="flex flex-col gap-1">
						{items.map((item) => (
							<div
								key={item.id}
								className="text-muted-foreground flex items-center justify-between rounded-md px-2 py-1 text-sm"
							>
								<span>
									{item.type === "DISTANCE"
										? `Trip · ${item.amount} km`
										: `${item.type.toLowerCase()} · $${item.amount.toFixed(2)}`}
									{item.note && ` · ${item.note}`}
								</span>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Remove item"
									onClick={() => removeItem(item.id)}
								>
									<X className="size-4" />
								</Button>
							</div>
						))}
					</div>
				)}
				<ErrorNote message={error} />
				<div className="flex gap-2">
					{session && (
						<Button variant="destructive" onClick={remove}>
							Delete
						</Button>
					)}
					<Button
						className="flex-1"
						disabled={clientIds.length === 0}
						onClick={submit}
					>
						Save
					</Button>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
