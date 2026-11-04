import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTimeSpan, stripTimezone } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format, isToday, startOfDay, subDays } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

const PAGE_DAYS = 14;

const dateKey = (date: Date) => format(date, "yyyy-MM-dd");

/**
 * Applies a Client's Regular Time to chosen days, newest first and never in the
 * future. `date` is the day the dialog was opened for, ticked by default unless
 * the Client already has an Activity on it.
 */
export function RegularTimeTab({
	date,
	onDone
}: {
	date: Date;
	onDone: () => void;
}) {
	const trpcUtils = trpc.useUtils();
	const { data: regularTimes } = trpc.regularTime.list.useQuery();
	const applyMutation = trpc.regularTime.applyToDates.useMutation();

	const [clientId, setClientId] = useState<string>();
	const [dayCount, setDayCount] = useState(PAGE_DAYS);
	// Only the days the Provider has clicked; the rest keep their default.
	const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

	const today = startOfDay(new Date());
	const days = Array.from({ length: dayCount }, (_, i) => subDays(today, i));
	const openedKey = dateKey(date > today ? today : date);

	const { data: datesWithActivity } =
		trpc.regularTime.datesWithActivity.useQuery(
			{ clientId: clientId ?? "", dates: days.map(stripTimezone) },
			{ enabled: !!clientId }
		);
	const existing = new Set(datesWithActivity);

	const isTicked = (key: string) =>
		overrides.get(key) ?? (key === openedKey && !existing.has(key));
	const ticked = days.filter((day) => isTicked(dateKey(day)));

	const regularTime = regularTimes?.find((rt) => rt.clientId === clientId);

	const pickClient = (id: string) => {
		setClientId(id);
		setOverrides(new Map());
	};

	const create = async () => {
		if (!clientId) return;
		try {
			const { count } = await applyMutation.mutateAsync({
				clientId,
				dates: ticked.map(stripTimezone)
			});

			await trpcUtils.activity.invalidate();
			trpcUtils.regularTime.datesWithActivity.invalidate();

			toast.success(
				`${count} ${count === 1 ? "activity" : "activities"} created`
			);
			onDone();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create activities"
			);
		}
	};

	if (!regularTimes) return <Loader2 className="mx-auto my-8 animate-spin" />;

	if (regularTimes.length === 0) {
		return (
			<p className="text-muted-foreground py-8 text-center text-sm">
				No Client has a regular time yet. Set one on a Client page.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap gap-2">
				{regularTimes.map((rt) => (
					<button
						key={rt.clientId}
						type="button"
						aria-pressed={clientId === rt.clientId}
						onClick={() => pickClient(rt.clientId)}
						className={cn(
							"flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors",
							clientId === rt.clientId
								? "border-primary bg-primary/10"
								: "hover:bg-accent"
						)}
					>
						<span className="text-sm font-medium">{rt.client.name}</span>
						<span className="text-muted-foreground text-xs">
							{formatTimeSpan(rt.startTime, rt.endTime)}
							{rt.claimsTravel ? " + travel" : ""}
						</span>
					</button>
				))}
			</div>

			{regularTime && (
				<>
					<div className="flex flex-col divide-y rounded-lg border">
						{days.map((day) => {
							const key = dateKey(day);
							return (
								<label
									key={key}
									className="hover:bg-accent/50 flex cursor-pointer items-center gap-3 px-3 py-2"
								>
									<Checkbox
										checked={isTicked(key)}
										onCheckedChange={(checked) =>
											setOverrides(new Map(overrides).set(key, !!checked))
										}
									/>
									<span className="text-sm">
										{isToday(day) ? "Today" : format(day, "EEE d MMM")}
									</span>
									{existing.has(key) && (
										<span className="text-destructive ml-auto text-xs">
											Already has an Activity
										</span>
									)}
								</label>
							);
						})}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setDayCount(dayCount + PAGE_DAYS)}
					>
						Show earlier days
					</Button>
				</>
			)}

			<Button
				type="button"
				disabled={
					!regularTime ||
					!datesWithActivity ||
					ticked.length === 0 ||
					applyMutation.isPending
				}
				onClick={create}
			>
				{applyMutation.isPending && (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				)}
				{ticked.length === 0
					? "Pick dates"
					: `Create ${ticked.length} ${ticked.length === 1 ? "Activity" : "Activities"}`}
			</Button>
		</div>
	);
}
