import { ClientQuickSelect } from "@/components/forms/client-quick-select";
import { SummingDistanceInput } from "@/components/forms/summing-distance-input";
import {
	TimeRangeInput,
	TimeRangeValue,
	validateTimeRange
} from "@/components/forms/time-range-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { stripTimezone } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type {
	ActivitySchema,
	ActivityTransportItemSchema
} from "@/schema/activity-schema";
import {
	appendParticipant,
	removeParticipantAt,
	setParticipantAt
} from "@/lib/group-participants";
import {
	MAX_ADDITIONAL_GROUP_PARTICIPANTS,
	totalGroupSize
} from "@/schema/invoice-schema";
import dayjs from "dayjs";
import {
	ChevronDown,
	ChevronUp,
	Loader2,
	Plus,
	Trash2,
	Link2,
	Users
} from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

interface ActivityRowData {
	id: string;
	clientId: string;
	isGroup: boolean;
	groupClientIds: string[];
	timeRange: TimeRangeValue;
	transportKm: number | undefined;
	transportItems: ActivityTransportItemSchema[];
	supportItemId: string;
	showAdvanced: boolean;
	errors: {
		client?: string;
		groupClient?: string;
		timeRange?: string;
	};
}

function createEmptyRow(): ActivityRowData {
	return {
		id: crypto.randomUUID(),
		clientId: "",
		isGroup: false,
		groupClientIds: [],
		timeRange: { startTime: "", endTime: "" },
		transportKm: undefined,
		transportItems: [],
		supportItemId: "",
		showAdvanced: false,
		errors: {}
	};
}

interface Props {
	date: Date | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function MultiActivityForm({
	date: initialDate,
	open,
	onOpenChange,
	onSuccess
}: Props) {
	const [date, setDate] = useState<Date>(initialDate ?? new Date());
	const [rows, setRows] = useState<ActivityRowData[]>([createEmptyRow()]);

	const trpcUtils = trpc.useUtils();
	const { data: { defaultSupportItemId, defaultGroupSupportItemId } = {} } =
		trpc.user.fetch.useQuery();
	const bulkAddMutation = trpc.activity.bulkAdd.useMutation();

	const updateRow = (id: string, updates: Partial<ActivityRowData>) => {
		setRows((prev) =>
			prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
		);
	};

	const addRow = () => {
		const lastRow = rows[rows.length - 1];
		const newRow = createEmptyRow();

		// Pre-fill start time with previous end time for continuity
		if (lastRow?.timeRange.endTime) {
			newRow.timeRange.startTime = lastRow.timeRange.endTime;
		}

		setRows((prev) => [...prev, newRow]);
	};

	const removeRow = (id: string) => {
		if (rows.length <= 1) return;
		setRows((prev) => prev.filter((row) => row.id !== id));
	};

	const addTransportItem = (rowId: string) => {
		updateRow(rowId, {
			transportItems: [
				...rows.find((r) => r.id === rowId)!.transportItems,
				{ type: "PARKING", amount: 0, note: "" }
			]
		});
	};

	const updateTransportItem = (
		rowId: string,
		index: number,
		updates: Partial<ActivityTransportItemSchema>
	) => {
		const row = rows.find((r) => r.id === rowId);
		if (!row) return;

		const items = [...row.transportItems];
		items[index] = { ...items[index], ...updates };
		updateRow(rowId, { transportItems: items });
	};

	const removeTransportItem = (rowId: string, index: number) => {
		const row = rows.find((r) => r.id === rowId);
		if (!row) return;

		updateRow(rowId, {
			transportItems: row.transportItems.filter((_, i) => i !== index)
		});
	};

	const validateRows = (): boolean => {
		let isValid = true;
		const newRows = rows.map((row) => {
			const errors: ActivityRowData["errors"] = {};

			if (!row.clientId) {
				errors.client = "Client is required";
				isValid = false;
			}

			if (row.isGroup && row.groupClientIds.length === 0) {
				errors.groupClient = "At least one other participant is required";
				isValid = false;
			}

			const timeError = validateTimeRange(row.timeRange);
			if (timeError) {
				errors.timeRange = timeError;
				isValid = false;
			}

			return { ...row, errors };
		});

		setRows(newRows);
		return isValid;
	};

	const handleSubmit = async () => {
		// Filter out completely empty rows
		const nonEmptyRows = rows.filter(
			(row) => row.clientId || row.timeRange.startTime || row.timeRange.endTime
		);

		if (nonEmptyRows.length === 0) {
			toast.error("Add at least one activity");
			return;
		}

		// Validate remaining rows
		setRows(nonEmptyRows.length === 0 ? [createEmptyRow()] : nonEmptyRows);

		if (!validateRows()) {
			toast.error("Please fix the errors before saving");
			return;
		}

		const activities: ActivitySchema[] = [];
		let hasGroupActivities = false;

		nonEmptyRows.forEach((row) => {
			const transportItems: ActivityTransportItemSchema[] = [];

			// Add distance transport item if specified
			if (row.transportKm && row.transportKm > 0) {
				transportItems.push({
					type: "DISTANCE",
					amount: row.transportKm
				});
			}

			// Add other transport items (parking, toll, etc)
			transportItems.push(
				...row.transportItems.filter((item) => item.amount > 0)
			);

			// Use group support item for group activities, otherwise use default
			const supportItemId = row.isGroup
				? row.supportItemId || defaultGroupSupportItemId || ""
				: row.supportItemId || defaultSupportItemId || "";

			const groupSize =
				row.isGroup && row.groupClientIds.length > 0
					? totalGroupSize(row.groupClientIds)
					: undefined;

			// Primary client activity (always created)
			activities.push({
				clientId: row.clientId,
				date: stripTimezone(date),
				startTime: row.timeRange.startTime,
				endTime: row.timeRange.endTime,
				supportItemId,
				groupSize,
				transportItems: transportItems.length > 0 ? transportItems : undefined
			});

			// Other participants' activities (only for group activities)
			if (row.isGroup && row.groupClientIds.length > 0) {
				hasGroupActivities = true;
				for (const groupClientId of row.groupClientIds) {
					activities.push({
						clientId: groupClientId,
						date: stripTimezone(date),
						startTime: row.timeRange.startTime,
						endTime: row.timeRange.endTime,
						supportItemId,
						groupSize
						// No transport items for other participants
					});
				}
			}
		});

		try {
			const result = await bulkAddMutation.mutateAsync({
				activities,
				autoCreateTrip: !hasGroupActivities
			});

			await trpcUtils.activity.byDateRange.invalidate();
			trpcUtils.activity.list.invalidate();
			trpcUtils.activity.pending.invalidate();

			const tripMessage = result.tripId ? " · Linked as trip" : "";
			toast.success(
				`${result.activities.length} ${result.activities.length === 1 ? "activity" : "activities"} saved${tripMessage}`
			);

			onSuccess?.();
			onOpenChange(false);

			// Reset form
			setRows([createEmptyRow()]);
		} catch (error) {
			toast.error("Failed to save activities");
		}
	};

	if (!open) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[100dvh] overflow-y-auto max-sm:h-full max-sm:max-w-full max-sm:rounded-none sm:max-h-[85vh] sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Add Activities</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-6">
					<div className="flex items-center gap-4">
						<Label className="w-12">Date</Label>
						<DatePicker date={date} setDate={(d) => d && setDate(d)} />
					</div>

					<div className="flex flex-col gap-4">
						{rows.map((row, index) => (
							<ActivityRow
								key={row.id}
								row={row}
								index={index}
								defaultSupportItemId={defaultSupportItemId ?? undefined}
								defaultGroupSupportItemId={
									defaultGroupSupportItemId ?? undefined
								}
								onUpdate={(updates) => updateRow(row.id, updates)}
								onRemove={() => removeRow(row.id)}
								onAddTransportItem={() => addTransportItem(row.id)}
								onUpdateTransportItem={(idx, updates) =>
									updateTransportItem(row.id, idx, updates)
								}
								onRemoveTransportItem={(idx) =>
									removeTransportItem(row.id, idx)
								}
								canRemove={rows.length > 1}
							/>
						))}
					</div>

					<Button
						type="button"
						variant="outline"
						onClick={addRow}
						className="w-full"
					>
						<Plus className="mr-2 h-4 w-4" />
						Add activity
					</Button>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={bulkAddMutation.isPending}>
						{bulkAddMutation.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							"Save all"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface ActivityRowProps {
	row: ActivityRowData;
	index: number;
	defaultSupportItemId?: string;
	defaultGroupSupportItemId?: string;
	onUpdate: (updates: Partial<ActivityRowData>) => void;
	onRemove: () => void;
	onAddTransportItem: () => void;
	onUpdateTransportItem: (
		index: number,
		updates: Partial<ActivityTransportItemSchema>
	) => void;
	onRemoveTransportItem: (index: number) => void;
	canRemove: boolean;
}

function ActivityRow({
	row,
	index,
	defaultSupportItemId,
	defaultGroupSupportItemId,
	onUpdate,
	onRemove,
	onAddTransportItem,
	onUpdateTransportItem,
	onRemoveTransportItem,
	canRemove
}: ActivityRowProps) {
	// Check if this activity is contiguous with a potential previous one
	const isContiguous = row.timeRange.startTime !== "";

	const handleGroupToggle = () => {
		onUpdate({
			isGroup: !row.isGroup,
			groupClientIds: !row.isGroup ? [] : row.groupClientIds,
			errors: { ...row.errors, groupClient: undefined }
		});
	};

	const setGroupClientIds = (groupClientIds: string[]) =>
		onUpdate({
			groupClientIds,
			errors: { ...row.errors, groupClient: undefined }
		});

	const updateGroupClientId = (index: number, clientId: string) =>
		setGroupClientIds(setParticipantAt(row.groupClientIds, index, clientId));

	const addGroupParticipant = () =>
		setGroupClientIds(appendParticipant(row.groupClientIds));

	const removeGroupParticipant = (index: number) =>
		setGroupClientIds(removeParticipantAt(row.groupClientIds, index));

	return (
		<div className="bg-muted/30 relative rounded-lg border p-4">
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground text-sm font-medium">
						Activity {index + 1}
					</span>
					<button
						type="button"
						onClick={handleGroupToggle}
						className={cn(
							"flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
							row.isGroup
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:bg-muted/80"
						)}
					>
						<Users className="h-3 w-3" />
						Group
					</button>
				</div>
				<div className="flex items-center gap-2">
					{isContiguous && index > 0 && !row.isGroup && (
						<Badge variant="outline" className="text-xs">
							<Link2 className="mr-1 h-3 w-3" />
							Back-to-back
						</Badge>
					)}
					{canRemove && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onRemove}
							className="text-destructive hover:text-destructive h-8 w-8 p-0"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<div>
					<Label className={cn(row.errors.client && "text-destructive")}>
						{row.isGroup ? "First participant" : "Client"}
					</Label>
					<ClientQuickSelect
						value={row.clientId}
						onChange={(clientId) =>
							onUpdate({
								clientId,
								errors: { ...row.errors, client: undefined }
							})
						}
					/>
					{row.errors.client && (
						<p className="text-destructive mt-1 text-sm">{row.errors.client}</p>
					)}
				</div>

				{row.isGroup && (
					<div>
						<Label className={cn(row.errors.groupClient && "text-destructive")}>
							Other participants
						</Label>
						<div className="flex flex-col gap-2">
							{row.groupClientIds.map((groupClientId, participantIndex) => (
								<div key={participantIndex} className="flex items-center gap-2">
									<div className="flex-1">
										<ClientQuickSelect
											value={groupClientId}
											onChange={(clientId) =>
												updateGroupClientId(participantIndex, clientId)
											}
											excludeClientId={row.clientId}
											excludeClientIds={row.groupClientIds.filter(
												(_, i) => i !== participantIndex
											)}
										/>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => removeGroupParticipant(participantIndex)}
										className="text-destructive hover:text-destructive h-8 w-8 p-0"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
						{row.groupClientIds.length < MAX_ADDITIONAL_GROUP_PARTICIPANTS && (
							<button
								type="button"
								onClick={addGroupParticipant}
								className="text-muted-foreground hover:text-foreground mt-2 text-left text-sm underline-offset-4 hover:underline"
							>
								+ add participant
							</button>
						)}
						{row.errors.groupClient && (
							<p className="text-destructive mt-1 text-sm">
								{row.errors.groupClient}
							</p>
						)}
					</div>
				)}

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label className={cn(row.errors.timeRange && "text-destructive")}>
							Time
						</Label>
						<TimeRangeInput
							value={row.timeRange}
							onChange={(timeRange) =>
								onUpdate({
									timeRange,
									errors: { ...row.errors, timeRange: undefined }
								})
							}
							error={row.errors.timeRange}
						/>
						{row.errors.timeRange && (
							<p className="text-destructive mt-1 text-sm">
								{row.errors.timeRange}
							</p>
						)}
					</div>

					<div>
						<Label>Transport (km)</Label>
						<SummingDistanceInput
							value={row.transportKm}
							onChange={(transportKm) => onUpdate({ transportKm })}
						/>
					</div>
				</div>

				{/* Parking/Tolls */}
				{row.transportItems.length > 0 && (
					<div className="flex flex-col gap-2">
						{row.transportItems.map((item, idx) => (
							<div key={idx} className="flex items-center gap-2">
								<select
									value={item.type}
									onChange={(e) =>
										onUpdateTransportItem(idx, {
											type: e.target
												.value as ActivityTransportItemSchema["type"]
										})
									}
									className="border-input bg-background h-10 rounded-md border px-3 text-sm"
								>
									<option value="PARKING">Parking</option>
									<option value="TOLL">Toll</option>
									<option value="OTHER">Other</option>
								</select>
								<div className="relative flex-1">
									<span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
										$
									</span>
									<Input
										type="number"
										step="0.01"
										min="0"
										value={item.amount || ""}
										onChange={(e) =>
											onUpdateTransportItem(idx, {
												amount: parseFloat(e.target.value) || 0
											})
										}
										className="pl-7"
										placeholder="0.00"
									/>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => onRemoveTransportItem(idx)}
									className="text-destructive hover:text-destructive h-8 w-8 p-0"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>
				)}

				<button
					type="button"
					onClick={onAddTransportItem}
					className="text-muted-foreground hover:text-foreground text-left text-sm underline-offset-4 hover:underline"
				>
					+ parking / tolls
				</button>

				{/* Advanced (Support Item override) */}
				<div>
					<button
						type="button"
						onClick={() => onUpdate({ showAdvanced: !row.showAdvanced })}
						className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
					>
						{row.showAdvanced ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
						Advanced
					</button>

					{row.showAdvanced && (
						<div className="mt-2">
							<Label>Support Item</Label>
							<p className="text-muted-foreground text-xs">
								{row.supportItemId || defaultSupportItemId
									? "Using custom support item"
									: "Using default support item"}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default MultiActivityForm;
