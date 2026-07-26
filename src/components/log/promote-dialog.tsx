// The day-Promotion review: every Session of the chosen day, the Support
// Item each will bill (the Provider's default, overridable per Session), and
// the one deliberate action that turns the day into Pending Activities plus
// a Trip. Promotion is the only online-only Log action - it consumes the
// day's Sessions server-side, so it waits for captures to finish syncing.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { dropDay } from "@/lib/log/log-store";
import { formatDayKey } from "@/lib/log/log-time";
import { isGroupSession, type LogSession } from "@/lib/log/log-types";
import type { Log } from "@/hooks/use-log";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useState } from "react";
import { SessionMeta } from "./session-meta";
import { WarningNote } from "./warning-note";

export function PromoteDialog({
	log,
	dateKey,
	onClose
}: {
	log: Log;
	dateKey: string;
	onClose: () => void;
}) {
	const sessions = log.sessionsByDay.get(dateKey) ?? [];
	const hasOpen = sessions.some((session) => session.endTime === null);

	const utils = trpc.useUtils();
	const user = trpc.user.fetch.useQuery();
	const supportItems = trpc.supportItem.list.useQuery({ limit: 100 });
	const [overrides, setOverrides] = useState<Record<string, string>>({});
	const promote = trpc.log.promoteDay.useMutation({
		onSuccess: () => {
			// The server consumed the day; mirror that locally and refresh the
			// Activity world the promoted Sessions now live in.
			dropDay(dateKey);
			void utils.invalidate();
		}
	});
	const result = promote.data;

	const defaultItemIdFor = (session: LogSession) =>
		isGroupSession(session)
			? user.data?.defaultGroupSupportItemId
			: user.data?.defaultSupportItemId;
	const itemIdFor = (session: LogSession) =>
		overrides[session.id] ?? defaultItemIdFor(session) ?? "";

	const missingDefault = sessions.some((session) => !itemIdFor(session));
	const blocker = hasOpen
		? "A Session is still Open - end it before promoting."
		: !log.online
			? "You're offline - promoting needs a connection."
			: log.queue.length > 0
				? "Waiting for captures to finish syncing..."
				: missingDefault
					? "Set a default Support Item (Account) or pick one per Session."
					: null;

	const submit = () => {
		const explicitOverrides = Object.fromEntries(
			Object.entries(overrides).filter(
				([sessionId, itemId]) =>
					itemId !==
					defaultItemIdFor(
						sessions.find((s) => s.id === sessionId) as LogSession
					)
			)
		);
		promote.mutate({
			date: new Date(dateKey),
			supportItemOverrides:
				Object.keys(explicitOverrides).length > 0
					? explicitOverrides
					: undefined
		});
	};

	return (
		<ResponsiveDialog open onOpenChange={(open) => !open && onClose()}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>
						Promote {formatDayKey(dateKey)}
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Every Session becomes a Pending Activity and the day&apos;s drives
						become a Trip. The Log entries are consumed.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
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
						<div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
							{sessions.map((session) => {
								const options = (supportItems.data?.supportItems ?? []).filter(
									(item) => Boolean(item.isGroup) === isGroupSession(session)
								);
								return (
									<div
										key={session.id}
										className="border-border flex flex-col gap-2 rounded-md border px-3 py-2 text-sm"
									>
										<div className="flex items-start justify-between gap-2">
											<span className="min-w-0 font-medium break-words">
												{log.participantNames(session)}
											</span>
											<span className="text-muted-foreground shrink-0 font-mono text-xs">
												{session.startTime} -{" "}
												{session.endTime ?? (
													<Badge variant="destructive">open</Badge>
												)}
											</span>
										</div>
										<SessionMeta session={session} />
										<Select
											value={itemIdFor(session)}
											onValueChange={(value) =>
												setOverrides((current) => ({
													...current,
													[session.id]: value
												}))
											}
										>
											<SelectTrigger
												className="w-full"
												aria-label="Support Item"
											>
												<SelectValue placeholder="Pick a Support Item" />
											</SelectTrigger>
											<SelectContent>
												{options.map((item) => (
													<SelectItem key={item.id} value={item.id}>
														{item.description}
														{item.id === defaultItemIdFor(session) &&
															" (default)"}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								);
							})}
						</div>
						{blocker && <WarningNote>{blocker}</WarningNote>}
						{promote.error && (
							<p className="text-destructive text-sm">
								{promote.error.message}
							</p>
						)}
						<Button
							disabled={blocker !== null || promote.isPending}
							onClick={submit}
						>
							Promote day
						</Button>
					</>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
