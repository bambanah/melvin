import ClientSelect from "@/components/forms/client-select";
import SupportItemSelect from "@/components/forms/support-item-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
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
import { ActivitySchema, activitySchema } from "@/schema/activity-schema";
import { ActivityByIdOutput } from "@/server/api/routers/activity-router";
import { SupportItemListOutput } from "@/server/api/routers/support-item-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/utc"));
dayjs.extend(require("dayjs/plugin/localizedFormat"));
dayjs.extend(require("dayjs/plugin/customParseFormat"));

interface Props {
	existingActivity?: ActivityByIdOutput;
}

const CreateActivityForm = ({ existingActivity }: Props) => {
	const router = useRouter();

	const [supportItems, setSupportItems] = useState<SupportItemListOutput[]>();

	const trpcUtils = trpc.useUtils();
	const createActivityMutation = trpc.activity.add.useMutation();
	const modifyActivityMutation = trpc.activity.modify.useMutation();

	const form = useForm<ActivitySchema>({
		resolver: zodResolver(activitySchema),
		mode: "onBlur",
		defaultValues: {
			date: existingActivity?.date
				? existingActivity.date
				: stripTimezone(new Date()),
			supportItemId: existingActivity?.supportItem.id ?? "",
			clientId: existingActivity?.client?.id ?? "",
			startTime: existingActivity?.startTime
				? dayjs.utc(existingActivity?.startTime).format("HH:mm")
				: "",
			endTime: existingActivity?.startTime
				? dayjs.utc(existingActivity?.endTime).format("HH:mm")
				: "",
			itemDistance: existingActivity?.itemDistance ?? undefined,
			transitDistance: existingActivity?.transitDistance
				? existingActivity?.transitDistance.toString()
				: "",
			transitDuration: existingActivity?.transitDuration
				? existingActivity?.transitDuration.toString()
				: "",
		},
	});

	const onSubmit = (data: ActivitySchema) => {
		const rateType = supportItems?.find(
			(i) => i.id === data.supportItemId
		)?.rateType;

		const activityData: ActivitySchema = {
			...data,
			startTime: rateType === "KM" ? undefined : data.startTime,
			endTime: rateType === "KM" ? undefined : data.endTime,
			itemDistance: rateType === "KM" ? data.itemDistance : undefined,
		};

		if (existingActivity?.id) {
			modifyActivityMutation
				.mutateAsync({ id: existingActivity.id, activity: activityData })
				.then(() => {
					trpcUtils.activity.list.invalidate();
					trpcUtils.activity.byId.invalidate({ id: existingActivity.id });

					toast.success("Activity updated");
					router.back();
				});
		} else {
			createActivityMutation
				.mutateAsync({ activity: activityData })
				.then(() => {
					trpcUtils.activity.list.invalidate();

					toast.success("Activity created");
					router.push("/dashboard/activities");
				});
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-md flex-col items-center gap-12 p-3">
			<Heading className="">
				{existingActivity ? `Update Activity` : "Log Activity"}
			</Heading>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex w-full flex-col items-center gap-5"
				>
					<FormField
						name="supportItemId"
						control={form.control}
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel required>Support Item</FormLabel>
								<SupportItemSelect
									setSupportItems={setSupportItems}
									onValueChange={field.onChange}
									value={field.value}
								/>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="flex w-full gap-4">
						<FormField
							name="clientId"
							control={form.control}
							render={({ field }) => (
								<FormItem className="shrink grow basis-1/2">
									<FormLabel required>Client</FormLabel>
									<ClientSelect
										onValueChange={field.onChange}
										value={field.value}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="date"
							render={({ field }) => (
								<FormItem className="flex shrink grow basis-1/2 flex-col gap-1 pt-1">
									<FormLabel required>Date</FormLabel>
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
													<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
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
					</div>

					{supportItems?.find((i) => i.id === form.watch("supportItemId"))
						?.rateType === "KM" ? (
						<div className="flex w-full gap-4">
							<FormField
								name="itemDistance"
								control={form.control}
								render={({ field }) => (
									<FormItem className="">
										<FormLabel required>Distance</FormLabel>
										<FormControl>
											<Input type="time" {...field} />
										</FormControl>
										<FormDescription>
											Distance travelled with client
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					) : (
						<div className="flex w-full gap-4">
							<FormField
								name="startTime"
								control={form.control}
								render={({ field }) => (
									<FormItem className="shrink grow basis-1/2">
										<FormLabel required>Start Time</FormLabel>
										<FormControl>
											<Input type="time" {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								name="endTime"
								control={form.control}
								render={({ field }) => (
									<FormItem className="shrink grow basis-1/2">
										<FormLabel required>End Time</FormLabel>
										<FormControl>
											<Input type="time" {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
						</div>
					)}
					<hr className="w-full" />

					<div className="flex flex-col items-center gap-1">
						<Heading size="xsmall">Provider Travel</Heading>
						<div className="mt-4 flex w-full gap-4">
							<FormField
								name="transitDistance"
								control={form.control}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Transit Distance</FormLabel>
										<FormControl>
											<Input
												rules={{
													valueAsNumber: true,
												}}
												type="number"
												step={0.1}
												{...field}
											/>
										</FormControl>
										<FormDescription>
											Distance to client (in km)
										</FormDescription>
									</FormItem>
								)}
							/>
							<FormField
								name="transitDuration"
								control={form.control}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Transit Duration</FormLabel>
										<FormControl>
											<Input
												rules={{
													valueAsNumber: true,
												}}
												type="number"
												step={0.1}
												{...field}
											/>
										</FormControl>
										<FormDescription>
											Duration of drive (in minutes)
										</FormDescription>
									</FormItem>
								)}
							/>
						</div>
					</div>

					<div className="mt-4 flex justify-center gap-4">
						<Button type="submit" disabled={form.formState.isSubmitting}>
							{existingActivity ? "Update" : "Create"}
						</Button>
						<Button
							type="button"
							onClick={() => router.back()}
							variant="secondary"
						>
							Cancel
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export default CreateActivityForm;
