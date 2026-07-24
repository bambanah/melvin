import { ClientQuickSelect } from "@/components/forms/client-quick-select";
import { GroupParticipantsEditor } from "@/components/forms/group-participants-editor";
import { SummingDistanceInput } from "@/components/forms/summing-distance-input";
import { TimeRangeInput } from "@/components/forms/time-range-input";
import { TransportItemsEditor } from "@/components/forms/transport-items-editor";
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
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	ChevronDown,
	ChevronUp,
	Link2,
	Loader2,
	Plus,
	Trash2,
	Users
} from "lucide-react";
import { useState } from "react";
import {
	Controller,
	useFieldArray,
	useForm,
	type UseFormReturn
} from "react-hook-form";
import { toast } from "react-toastify";
import {
	buildBulkAddPayload,
	createEmptyRow,
	multiActivityFormSchema,
	type MultiActivityFormModel
} from "./multi-activity-form-model";

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
	const trpcUtils = trpc.useUtils();
	const { data: { defaultSupportItemId, defaultGroupSupportItemId } = {} } =
		trpc.user.fetch.useQuery();
	const bulkAddMutation = trpc.activity.bulkAdd.useMutation();

	const form = useForm<MultiActivityFormModel>({
		resolver: zodResolver(multiActivityFormSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: {
			date: initialDate ?? new Date(),
			activities: [createEmptyRow()]
		}
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "activities"
	});

	const addRow = () => {
		const rows = form.getValues("activities");
		const lastRow = rows[rows.length - 1];
		const newRow = createEmptyRow();

		// Pre-fill start time with previous end time for continuity
		if (lastRow?.timeRange.endTime) {
			newRow.timeRange.startTime = lastRow.timeRange.endTime;
		}

		append(newRow);
	};

	const onSubmit = (data: MultiActivityFormModel) => {
		const payload = buildBulkAddPayload(data.activities, data.date, {
			defaultSupportItemId: defaultSupportItemId ?? undefined,
			defaultGroupSupportItemId: defaultGroupSupportItemId ?? undefined
		});

		if (payload.activities.length === 0) {
			toast.error("Add at least one activity");
			return;
		}

		return bulkAddMutation
			.mutateAsync(payload)
			.then((result) => {
				trpcUtils.activity.byDateRange.invalidate();
				trpcUtils.activity.list.invalidate();
				trpcUtils.activity.pending.invalidate();

				const tripMessage = result.tripId ? " · Linked as trip" : "";
				toast.success(
					`${result.activities.length} ${result.activities.length === 1 ? "activity" : "activities"} saved${tripMessage}`
				);

				onSuccess?.();
				onOpenChange(false);

				// Reset rows, keeping the selected date
				form.reset({
					date: form.getValues("date"),
					activities: [createEmptyRow()]
				});
			})
			.catch(() => {
				toast.error("Failed to save activities");
			});
	};

	const onInvalid = () => {
		toast.error("Please fix the errors before saving");
	};

	if (!open) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[100dvh] overflow-y-auto max-sm:h-full max-sm:max-w-full max-sm:rounded-none sm:max-h-[85vh] sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Add Activities</DialogTitle>
				</DialogHeader>

				<form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
					<div className="flex flex-col gap-6">
						<div className="flex items-center gap-4">
							<Label className="w-12">Date</Label>
							<Controller
								control={form.control}
								name="date"
								render={({ field }) => (
									<DatePicker
										date={field.value}
										setDate={(d) => d && field.onChange(d)}
									/>
								)}
							/>
						</div>

						<div className="flex flex-col gap-4">
							{fields.map((field, index) => (
								<ActivityRow
									key={field.id}
									form={form}
									index={index}
									defaultSupportItemId={defaultSupportItemId ?? undefined}
									onRemove={() => remove(index)}
									canRemove={fields.length > 1}
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

					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={bulkAddMutation.isPending}>
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
				</form>
			</DialogContent>
		</Dialog>
	);
}

interface ActivityRowProps {
	form: UseFormReturn<MultiActivityFormModel>;
	index: number;
	defaultSupportItemId?: string;
	onRemove: () => void;
	canRemove: boolean;
}

function ActivityRow({
	form,
	index,
	defaultSupportItemId,
	onRemove,
	canRemove
}: ActivityRowProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);

	const { control, watch, setValue, clearErrors, formState } = form;
	const rowErrors = formState.errors.activities?.[index];

	const isGroup = watch(`activities.${index}.isGroup`);
	const startTime = watch(`activities.${index}.timeRange.startTime`);
	const clientId = watch(`activities.${index}.clientId`);
	const supportItemId = watch(`activities.${index}.supportItemId`);

	// Check if this activity is contiguous with a potential previous one
	const isContiguous = startTime !== "";

	const handleGroupToggle = () => {
		setValue(`activities.${index}.isGroup`, !isGroup);
		// Enabling group starts the participant list fresh
		if (!isGroup) {
			setValue(`activities.${index}.groupClientIds`, []);
		}
		clearErrors(`activities.${index}.groupClientIds`);
	};

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
							isGroup
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:bg-muted/80"
						)}
					>
						<Users className="h-3 w-3" />
						Group
					</button>
				</div>
				<div className="flex items-center gap-2">
					{isContiguous && index > 0 && !isGroup && (
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
					<Label className={cn(rowErrors?.clientId && "text-destructive")}>
						{isGroup ? "First participant" : "Client"}
					</Label>
					<Controller
						control={control}
						name={`activities.${index}.clientId`}
						render={({ field }) => (
							<ClientQuickSelect
								value={field.value}
								onChange={field.onChange}
							/>
						)}
					/>
					{rowErrors?.clientId && (
						<p className="text-destructive mt-1 text-sm">
							{rowErrors.clientId.message}
						</p>
					)}
				</div>

				{isGroup && (
					<div>
						<Label
							className={cn(rowErrors?.groupClientIds && "text-destructive")}
						>
							Other participants
						</Label>
						<Controller
							control={control}
							name={`activities.${index}.groupClientIds`}
							render={({ field }) => (
								<GroupParticipantsEditor
									value={field.value}
									onChange={field.onChange}
									excludeClientId={clientId}
									error={rowErrors?.groupClientIds?.message}
									renderClientSelect={({
										value,
										onChange,
										excludeClientId,
										excludeClientIds
									}) => (
										<ClientQuickSelect
											value={value}
											onChange={onChange}
											excludeClientId={excludeClientId}
											excludeClientIds={excludeClientIds}
										/>
									)}
								/>
							)}
						/>
					</div>
				)}

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label className={cn(rowErrors?.timeRange && "text-destructive")}>
							Time
						</Label>
						<Controller
							control={control}
							name={`activities.${index}.timeRange`}
							render={({ field }) => (
								<TimeRangeInput
									value={field.value}
									onChange={field.onChange}
									error={rowErrors?.timeRange?.message}
								/>
							)}
						/>
						{rowErrors?.timeRange && (
							<p className="text-destructive mt-1 text-sm">
								{rowErrors.timeRange.message}
							</p>
						)}
					</div>

					<div>
						<Label>Transport (km)</Label>
						<Controller
							control={control}
							name={`activities.${index}.transportKm`}
							render={({ field }) => (
								<SummingDistanceInput
									value={field.value}
									onChange={field.onChange}
								/>
							)}
						/>
					</div>
				</div>

				<Controller
					control={control}
					name={`activities.${index}.transportItems`}
					render={({ field }) => (
						<TransportItemsEditor
							value={field.value}
							onChange={field.onChange}
						/>
					)}
				/>

				{/* Advanced (Support Item override) */}
				<div>
					<button
						type="button"
						onClick={() => setShowAdvanced(!showAdvanced)}
						className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
					>
						{showAdvanced ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
						Advanced
					</button>

					{showAdvanced && (
						<div className="mt-2">
							<Label>Support Item</Label>
							<p className="text-muted-foreground text-xs">
								{supportItemId || defaultSupportItemId
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
