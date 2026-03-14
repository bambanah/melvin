import ClientSelect from "@/components/forms/client-select";
import SupportItemSelect from "@/components/forms/support-item-select";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { stripTimezone } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc";
import { type ActivitySchema, activitySchema } from "@/schema/activity-schema";
import type { SupportItemListOutput } from "@/server/api/routers/support-item-router";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

interface Props {
	day: Dayjs | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const QuickAddForm = ({ day, open, onOpenChange }: Props) => {
	const [supportItems, setSupportItems] = useState<SupportItemListOutput[]>();

	const trpcUtils = trpc.useUtils();
	const createActivityMutation = trpc.activity.add.useMutation();
	const { data: { defaultSupportItemId } = {} } = trpc.user.fetch.useQuery();

	const form = useForm<ActivitySchema>({
		resolver: zodResolver(activitySchema),
		mode: "onBlur",
		defaultValues: {
			date: day ? stripTimezone(day.toDate()) : stripTimezone(new Date()),
			supportItemId: "",
			clientId: "",
			startTime: "",
			endTime: "",
			itemDistance: undefined,
			transitDistance: "",
			transitDuration: ""
		}
	});

	// Reset form when day changes or dialog opens
	useEffect(() => {
		if (open && day) {
			form.reset({
				date: stripTimezone(day.toDate()),
				supportItemId: defaultSupportItemId ?? "",
				clientId: "",
				startTime: "",
				endTime: "",
				itemDistance: undefined,
				transitDistance: "",
				transitDuration: ""
			});
		}
	}, [open, day, form, defaultSupportItemId]);

	const { data: client, isFetching: isFetchingClient } =
		trpc.clients.byId.useQuery(
			{ id: form.watch("clientId") },
			{ enabled: !!form.watch("clientId") }
		);

	useEffect(() => {
		if (!client || isFetchingClient) {
			form.setValue("transitDistance", "");
			form.setValue("transitDuration", "");
			return;
		}

		if (client.defaultTransitDistance) {
			form.setValue(
				"transitDistance",
				client.defaultTransitDistance.toString()
			);
		}

		if (client.defaultTransitTime) {
			form.setValue("transitDuration", client.defaultTransitTime.toString());
		}
	}, [client, form, isFetchingClient]);

	const selectedRateType = supportItems?.find(
		(i) => i.id === form.watch("supportItemId")
	)?.rateType;

	const onSubmit = (data: ActivitySchema) => {
		const activityData: ActivitySchema = {
			...data,
			startTime: selectedRateType === "KM" ? undefined : data.startTime,
			endTime: selectedRateType === "KM" ? undefined : data.endTime,
			itemDistance: selectedRateType === "KM" ? data.itemDistance : undefined
		};

		createActivityMutation.mutateAsync({ activity: activityData }).then(() => {
			trpcUtils.activity.byDateRange.invalidate();
			trpcUtils.activity.list.invalidate();
			trpcUtils.activity.pending.invalidate();

			toast.success("Activity created");
			onOpenChange(false);
		});
	};

	if (!day) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add Activity — {day.format("ddd D MMM")}</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex flex-col gap-4"
					>
						<FormField
							name="clientId"
							control={form.control}
							render={({ field }) => (
								<FormItem>
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
							name="supportItemId"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel required>Support Item</FormLabel>
									<SupportItemSelect
										setSupportItems={setSupportItems}
										value={field.value}
										onValueChange={field.onChange}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>

						{selectedRateType === "KM" ? (
							<FormField
								name="itemDistance"
								control={form.control}
								render={({ field }) => (
									<FormItem>
										<FormLabel required>Distance (km)</FormLabel>
										<FormControl>
											<Input
												type="number"
												step={1}
												{...field}
												onChange={(e) =>
													field.onChange(
														e.target.value === ""
															? undefined
															: Number(e.target.value)
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						) : (
							<div className="flex gap-4">
								<FormField
									name="startTime"
									control={form.control}
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel required>Start Time</FormLabel>
											<FormControl>
												<Input type="time" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									name="endTime"
									control={form.control}
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel required>End Time</FormLabel>
											<FormControl>
												<Input type="time" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={createActivityMutation.isPending}>
								{createActivityMutation.isPending
									? "Adding..."
									: "Add Activity"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default QuickAddForm;
