import ClientSelect from "@/components/forms/client-select";
import SupportItemSelect from "@/components/forms/support-item-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import Heading from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { stripTimezone } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { InvoiceSchema } from "@/schema/invoice-schema";
import { format } from "date-fns";
import {
	ArrowDown,
	ArrowRight,
	ArrowUp,
	CalendarIcon,
	Clock,
	Plus,
	X,
} from "lucide-react";
import { useMemo } from "react";
import {
	Control,
	UseFormGetValues,
	UseFormSetValue,
	UseFormWatch,
	useFieldArray,
} from "react-hook-form";

import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/utc"));
dayjs.extend(require("dayjs/plugin/localizedFormat"));
dayjs.extend(require("dayjs/plugin/customParseFormat"));

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
	watch,
}: Props) => {
	const { data: { supportItems: groupSupportItems } = {} } =
		trpc.supportItem.list.useQuery({ description: "group" });

	const groupSupportItemIds = useMemo(
		() => groupSupportItems?.map((item) => item.id),
		[groupSupportItems]
	);

	const {
		fields,
		append: appendActivity,
		remove,
		update,
	} = useFieldArray({
		control,
		name: "activitiesToCreate",
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
			...previousActivities.slice(activityFieldIndex + 1),
		]);

		update(newIndex, {
			...getValues().activitiesToCreate[newIndex],
			activities: [
				...getValues().activitiesToCreate[newIndex].activities,
				activityToMove,
			],
		});
	};

	const handleDelete = (fieldIndex: number, activityFieldIndex: number) => {
		fields[fieldIndex].activities.splice(activityFieldIndex, 1);
		const field = getValues().activitiesToCreate[fieldIndex];

		update(fieldIndex, {
			...field,
			activities: [
				...field.activities.slice(0, activityFieldIndex),
				...field.activities.slice(activityFieldIndex),
			],
		});
	};

	const isGroupSupportItem = (supportItemId?: string) =>
		supportItemId && groupSupportItemIds?.includes(supportItemId);

	return (
		<div className="flex flex-col gap-4">
			<Heading size="xsmall">Create Activities</Heading>

			{fields.length > 0 && (
				<div className="mb-4 flex flex-col gap-6">
					{fields.map((field, index) => (
						<div key={field.id} className="flex flex-col">
							<div className="flex items-center gap-2">
								<FormField
									name={`activitiesToCreate.${index}.supportItemId`}
									control={control}
									render={({ field }) => (
										<FormItem className="shrink grow basis-1/2">
											<SupportItemSelect {...field} />
											<FormMessage />
										</FormItem>
									)}
								/>
								{isGroupSupportItem(
									watch("activitiesToCreate")[index].supportItemId
								) && (
									<FormField
										name={`activitiesToCreate.${index}.groupClientId`}
										control={control}
										render={({ field }) => (
											<FormItem className="shrink grow basis-1/2">
												<ClientSelect
													excludeClientId={watch("clientId")}
													{...field}
												/>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
								<button
									className="px-2 py-1 hover:shadow"
									onClick={() => remove(index)}
								>
									<X className="h-6 w-6" />
								</button>
							</div>

							<ul className="tree">
								{fields[index].activities.map((_, activityFieldIndex) => (
									<li
										className="flex w-full items-center justify-start gap-4"
										key={activityFieldIndex}
									>
										{fields.length > 1 && (
											<div className="flex flex-col justify-center gap-0">
												<button
													className={cn([
														"px-2 py-0 text-zinc-500 transition-colors hover:text-zinc-900 hover:shadow",
														index === 0 && "hidden",
													])}
													onClick={() =>
														handleMove("UP", index, activityFieldIndex)
													}
												>
													<ArrowUp className="h-6 w-6" />
												</button>
												<button
													className={cn([
														"px-2 py-0 text-zinc-500 transition-colors hover:text-zinc-900 hover:shadow",
														index === fields.length - 1 && "hidden",
													])}
													onClick={() =>
														handleMove("DOWN", index, activityFieldIndex)
													}
												>
													<ArrowDown className="h-6 w-6" />
												</button>
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
																		date > new Date() ||
																		date < new Date("1900-01-01")
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
										<button
											className="ml-auto px-2 py-1 hover:shadow"
											onClick={() => handleDelete(index, activityFieldIndex)}
										>
											<X className="h-6 w-6" />
										</button>
									</li>
								))}
								<li>
									<Button
										onClick={() => field.activities.push({ date: new Date() })}
										className="mt-2 px-6"
										variant="secondary"
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
					appendActivity({
						supportItemId: "",
						groupClientId: "",
						activities: [{ date: new Date() }],
					})
				}
				className="mx-auto w-full"
			>
				+ Add Support Item
			</Button>
		</div>
	);
};

export default InvoiceActivityCreationForm;
