import ClientSelect from "@/components/forms/client-select";
import SupportItemSelect from "@/components/forms/support-item-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	FormControl,
	FormField,
	FormItem,
	FormMessage
} from "@/components/ui/form";
import Heading from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from "@/components/ui/popover";
import { stripTimezone } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
	appendParticipant,
	removeParticipantAt,
	setParticipantAt
} from "@/lib/group-participants";
import {
	InvoiceSchema,
	MAX_ADDITIONAL_GROUP_PARTICIPANTS
} from "@/schema/invoice-schema";
import { format } from "date-fns";
import {
	ArrowRight,
	CalendarIcon,
	ChevronDown,
	ChevronUp,
	Clock,
	Plus,
	X
} from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import {
	Control,
	UseFormGetValues,
	UseFormSetValue,
	UseFormWatch,
	useFieldArray
} from "react-hook-form";

interface Props {
	control: Control<InvoiceSchema>;
	getValues: UseFormGetValues<InvoiceSchema>;
	setValue: UseFormSetValue<InvoiceSchema>;
	watch: UseFormWatch<InvoiceSchema>;
}

const InvoiceActivityCreationForm = ({
	control,
	getValues,
	setValue,
	watch
}: Props) => {
	const { data: { supportItems: groupSupportItems } = {} } =
		trpc.supportItem.list.useQuery({ isGroup: true });

	const groupSupportItemIds = useMemo(
		() => groupSupportItems?.map((item) => item.id),
		[groupSupportItems]
	);

	const {
		fields,
		append: appendActivityGroup,
		remove,
		update
	} = useFieldArray({
		control,
		name: "activitiesToCreate"
	});

	const handleMove = (
		direction: "UP" | "DOWN",
		previousFieldIndex: number,
		activityFieldIndex: number
	) => {
		const newIndex =
			direction === "UP" ? previousFieldIndex - 1 : previousFieldIndex + 1;

		if (newIndex < 0 || newIndex > fields.length - 1) {
			return;
		}

		const previousActivities =
			getValues().activitiesToCreate[previousFieldIndex].activities;
		const activityToMove = previousActivities[activityFieldIndex];

		setValue(`activitiesToCreate.${previousFieldIndex}.activities`, [
			...previousActivities.slice(0, activityFieldIndex),
			...previousActivities.slice(activityFieldIndex + 1)
		]);

		update(newIndex, {
			...getValues().activitiesToCreate[newIndex],
			activities: [
				...getValues().activitiesToCreate[newIndex].activities,
				activityToMove
			]
		});
	};

	const appendActivity = (idx: number) => {
		update(idx, {
			...getValues().activitiesToCreate[idx],
			activities: [
				...getValues().activitiesToCreate[idx].activities,
				{ date: stripTimezone(new Date()) }
			]
		});
	};

	const handleDelete = (fieldIndex: number, activityFieldIndex: number) => {
		fields[fieldIndex].activities.splice(activityFieldIndex, 1);
		const field = getValues().activitiesToCreate[fieldIndex];

		update(fieldIndex, {
			...field,
			activities: [
				...field.activities.slice(0, activityFieldIndex),
				...field.activities.slice(activityFieldIndex)
			]
		});
	};

	const isGroupSupportItem = useCallback(
		(supportItemId?: string) =>
			supportItemId && groupSupportItemIds?.includes(supportItemId),
		[groupSupportItemIds]
	);

	const activitiesToCreate = watch("activitiesToCreate");
	useEffect(() => {
		activitiesToCreate?.forEach((activity, idx) => {
			if (isGroupSupportItem(activity.supportItemId)) {
				setValue(`activitiesToCreate.${idx}.groupClientIds`, []);
			}
		});
	}, [isGroupSupportItem, setValue, activitiesToCreate]);

	const setGroupClientIds = (activityIndex: number, groupClientIds: string[]) =>
		setValue(
			`activitiesToCreate.${activityIndex}.groupClientIds`,
			groupClientIds
		);

	const currentGroupClientIds = (activityIndex: number): string[] =>
		getValues().activitiesToCreate[activityIndex].groupClientIds ?? [];

	const updateGroupClientId = (
		activityIndex: number,
		participantIndex: number,
		clientId: string
	) =>
		setGroupClientIds(
			activityIndex,
			setParticipantAt(
				currentGroupClientIds(activityIndex),
				participantIndex,
				clientId
			)
		);

	const addGroupParticipant = (activityIndex: number) =>
		setGroupClientIds(
			activityIndex,
			appendParticipant(currentGroupClientIds(activityIndex))
		);

	const removeGroupParticipant = (
		activityIndex: number,
		participantIndex: number
	) =>
		setGroupClientIds(
			activityIndex,
			removeParticipantAt(
				currentGroupClientIds(activityIndex),
				participantIndex
			)
		);

	return (
		<div className="flex flex-col gap-4">
			<Heading size="xsmall">Create Activities</Heading>

			{fields.length > 0 && (
				<div className="mb-4 flex flex-col gap-6">
					{fields.map((field, index) => (
						<div key={field.id} className="flex flex-col">
							<div className="flex items-start gap-2">
								<FormField
									name={`activitiesToCreate.${index}.supportItemId`}
									control={control}
									render={({ field }) => (
										<FormItem className="shrink grow basis-1/2">
											<SupportItemSelect
												onValueChange={field.onChange}
												value={field.value}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => remove(index)}
									type="button"
								>
									<X className="h-6 w-6" />
								</Button>
							</div>

							{isGroupSupportItem(
								watch("activitiesToCreate")[index].supportItemId
							) && (
								<div className="mb-2 flex flex-col gap-2">
									{(
										watch(`activitiesToCreate.${index}.groupClientIds`) ?? []
									).map((groupClientId, participantIndex) => (
										<div
											key={participantIndex}
											className="flex items-center gap-2"
										>
											<div className="shrink grow basis-1/2">
												<ClientSelect
													excludeClientId={watch("clientId")}
													excludeClientIds={(
														watch(
															`activitiesToCreate.${index}.groupClientIds`
														) ?? []
													).filter((_, i) => i !== participantIndex)}
													onValueChange={(clientId) =>
														updateGroupClientId(
															index,
															participantIndex,
															clientId
														)
													}
													value={groupClientId}
												/>
											</div>
											<Button
												variant="ghost"
												size="icon"
												onClick={() =>
													removeGroupParticipant(index, participantIndex)
												}
												type="button"
											>
												<X className="h-6 w-6" />
											</Button>
										</div>
									))}
									{(watch(`activitiesToCreate.${index}.groupClientIds`) ?? [])
										.length < MAX_ADDITIONAL_GROUP_PARTICIPANTS && (
										<Button
											onClick={() => addGroupParticipant(index)}
											className="mr-auto"
											variant="outline"
											size="sm"
											type="button"
										>
											+ Add Participant
										</Button>
									)}
									{(watch(`activitiesToCreate.${index}.groupClientIds`) ?? [])
										.length === 0 && (
										<p className="text-destructive text-sm">
											At least one other participant is required
										</p>
									)}
								</div>
							)}

							<ul className="tree">
								{fields[index].activities.map((_, activityFieldIndex) => (
									<li
										className="flex w-full items-center justify-start gap-4"
										key={activityFieldIndex}
									>
										{fields.length > 1 && (
											<div className="flex flex-col justify-center gap-0">
												<Button
													className={index === 0 ? "hidden" : ""}
													variant="ghost"
													size="icon"
													onClick={() =>
														handleMove("UP", index, activityFieldIndex)
													}
													type="button"
												>
													<ChevronUp className="h-6 w-6" />
												</Button>
												<Button
													className={
														index === fields.length - 1 ? "hidden" : ""
													}
													variant="ghost"
													size="icon"
													onClick={() =>
														handleMove("DOWN", index, activityFieldIndex)
													}
													type="button"
												>
													<ChevronDown className="h-6 w-6" />
												</Button>
											</div>
										)}
										<span className="flex items-center gap-2">
											<CalendarIcon className="h-4 w-4" />
											<FormField
												control={control}
												name={`activitiesToCreate.${index}.activities.${activityFieldIndex}.date`}
												render={({ field }) => (
													<FormItem className="flex shrink grow basis-1/2 flex-col gap-1 pt-1">
														<Popover>
															<PopoverTrigger asChild>
																<FormControl>
																	<Button
																		variant={"outline"}
																		className={cn(
																			"pl-3 text-left font-normal",
																			!field.value && "text-muted-foreground"
																		)}
																	>
																		{field.value ? (
																			format(field.value, "PP")
																		) : (
																			<span>Pick a date</span>
																		)}
																	</Button>
																</FormControl>
															</PopoverTrigger>
															<PopoverContent
																className="w-auto p-0"
																align="start"
															>
																<Calendar
																	mode="single"
																	selected={field.value}
																	onSelect={(_, day) => {
																		field.onChange(stripTimezone(day));
																	}}
																	disabled={(date) =>
																		date > stripTimezone(new Date()) ||
																		date < stripTimezone(new Date("1900-01-01"))
																	}
																/>
															</PopoverContent>
														</Popover>
														<FormMessage />
													</FormItem>
												)}
											/>
										</span>
										<span className="flex items-center gap-2">
											<Clock className="h-6 w-6" />
											<FormField
												name={`activitiesToCreate.${index}.activities.${activityFieldIndex}.startTime`}
												control={control}
												render={({ field }) => (
													<FormItem className="shrink grow basis-1/2">
														<FormControl>
															<Input type="time" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											<ArrowRight className="h-6 w-6" />
											<FormField
												name={`activitiesToCreate.${index}.activities.${activityFieldIndex}.endTime`}
												control={control}
												render={({ field }) => (
													<FormItem className="shrink grow basis-1/2">
														<FormControl>
															<Input type="time" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</span>
										<Button
											className="ml-auto"
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(index, activityFieldIndex)}
											type="button"
										>
											<X className="h-6 w-6" />
										</Button>
									</li>
								))}
								<li>
									<Button
										onClick={() => appendActivity(index)}
										className="mt-2 px-6"
										variant="secondary"
										type="button"
									>
										<Plus className="h-4 w-4" />
									</Button>
								</li>
							</ul>
						</div>
					))}
				</div>
			)}

			<Button
				onClick={() =>
					appendActivityGroup({
						supportItemId: "",
						groupClientIds: [],
						activities: [{ date: stripTimezone(new Date()) }]
					})
				}
				className="mr-auto"
				variant="outline"
				type="button"
			>
				+ Add Support Item
			</Button>
		</div>
	);
};

export default InvoiceActivityCreationForm;
