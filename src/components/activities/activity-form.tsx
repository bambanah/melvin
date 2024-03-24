import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Heading from "@/components/ui/heading";
import Label from "@/components/ui/label-old";
import Subheading from "@/components/ui/subheading";
import ClientSelect from "@/components/forms/client-select";
import DatePicker from "@/components/forms/date-picker";
import ErrorMessage from "@/components/forms/error-message";
import { Input } from "@/components/ui/input";
import SupportItemSelect from "@/components/forms/support-item-select";
import TimeInput from "@/components/forms/time-input";
import { zodResolver } from "@hookform/resolvers/zod";
import { activitySchema, ActivitySchema } from "@/schema/activity-schema";
import { ActivityByIdOutput } from "@/server/api/routers/activity-router";
import { SupportItemListOutput } from "@/server/api/routers/support-item-router";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/customParseFormat"));

interface Props {
	existingActivity?: ActivityByIdOutput;
}

const CreateActivityForm = ({ existingActivity }: Props) => {
	const router = useRouter();

	const [supportItems, setSupportItems] = useState<SupportItemListOutput[]>();

	const trpcContext = trpc.useContext();
	const createActivityMutation = trpc.activity.add.useMutation();
	const modifyActivityMutation = trpc.activity.modify.useMutation();

	const form = useForm<ActivitySchema>({
		resolver: zodResolver(activitySchema),
		mode: "onBlur",
		defaultValues: {
			date: (existingActivity?.date
				? dayjs.utc(existingActivity?.date)
				: dayjs()
			).format("YYYY-MM-DD"),
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
				? Number(existingActivity?.transitDistance)
				: undefined,
			transitDuration: existingActivity?.transitDuration
				? Number(existingActivity?.transitDuration)
				: undefined,
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
					trpcContext.activity.list.invalidate();
					trpcContext.activity.byId.invalidate({ id: existingActivity.id });

					toast.success("Activity updated");
					router.back();
				});
		} else {
			createActivityMutation
				.mutateAsync({ activity: activityData })
				.then(() => {
					trpcContext.activity.list.invalidate();

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
					<div className="w-full">
						<Label htmlFor="supportItemId" className="shrink grow" required>
							<span>Support Item</span>
							<SupportItemSelect
								name="supportItemId"
								control={form.control}
								setSupportItems={setSupportItems}
							/>
							<ErrorMessage
								error={form.formState.errors.supportItemId?.message}
							/>
						</Label>
					</div>
					<div className="flex w-full gap-4">
						<Label
							htmlFor="clientId"
							className="shrink grow basis-1/2"
							required
						>
							<span>Client</span>
							<ClientSelect name="clientId" control={form.control} />
							<ErrorMessage error={form.formState.errors.clientId?.message} />
						</Label>
						<Label className="shrink grow basis-1/2" required>
							<span>Date</span>
							<DatePicker
								name="date"
								register={form.register}
								error={!!form.formState.errors.date}
							/>
							<ErrorMessage error={form.formState.errors.date?.message} />
						</Label>
					</div>

					{supportItems?.find((i) => i.id === form.watch("supportItemId"))
						?.rateType === "KM" ? (
						<div className="flex w-full gap-4">
							<Label
								htmlFor="itemDistance"
								className="w-full shrink grow basis-1/2"
								required
							>
								<span>Distance</span>
								<Subheading>Distance travelled with client</Subheading>
								<Input
									name="itemDistance"
									register={form.register}
									error={!!form.formState.errors.itemDistance}
									suffix="km"
									rules={{
										setValueAs: (v) => (v === "" ? null : Number(v)),
									}}
									className="w-full"
								/>
								<ErrorMessage
									error={form.formState.errors.itemDistance?.message}
								/>
							</Label>
						</div>
					) : (
						<div className="flex w-full gap-4">
							<Label className="w-full shrink grow basis-1/2" required>
								<span>Start Time</span>
								<TimeInput
									name="startTime"
									register={form.register}
									error={!!form.formState.errors.startTime}
									className="w-full"
								/>
								<ErrorMessage
									error={form.formState.errors.startTime?.message}
								/>
							</Label>
							<Label
								htmlFor="endTime"
								className="shrink grow basis-1/2"
								required
							>
								<span>End Time</span>
								<TimeInput
									name="endTime"
									register={form.register}
									error={!!form.formState.errors.endTime}
								/>
								<ErrorMessage error={form.formState.errors.endTime?.message} />
							</Label>
						</div>
					)}
					<hr className="w-full" />

					<div className="flex flex-col items-center gap-1">
						<Heading size="xsmall">Provider Travel</Heading>

						{/* TODO: Autofill from previous invoice */}
						{false && <p>Autofilled from previous invoice</p>}

						<div className="mt-4 flex w-full gap-4">
							<Label
								htmlFor="transitDistance"
								className="w-full shrink grow basis-1/2"
							>
								<span>Transit Distance</span>
								<Subheading>Distance to client</Subheading>
								<Input
									name="transitDistance"
									register={form.register}
									suffix="km"
									rules={{
										setValueAs: (v) => (v === "" ? null : Number(v)),
									}}
									error={!!form.formState.errors.transitDistance}
								/>
								<ErrorMessage
									error={form.formState.errors.transitDistance?.message}
								/>
							</Label>
							<Label
								htmlFor="transitDuration"
								className="shrink grow basis-1/2"
							>
								<span>Transit Duration</span>
								<Subheading>Duration of drive</Subheading>
								<Input
									name="transitDuration"
									register={form.register}
									suffix="mins"
									rules={{
										setValueAs: (v) => (v === "" ? null : Number(v)),
									}}
									error={!!form.formState.errors.transitDuration}
								/>
								<ErrorMessage
									error={form.formState.errors.transitDuration?.message}
								/>
							</Label>
						</div>
					</div>

					<div className="mt-4 flex justify-center gap-4">
						<Button
							type="submit"
							disabled={
								form.formState.isSubmitting ||
								!form.formState.isDirty ||
								!form.formState.isValid
							}
						>
							{existingActivity ? "Update" : "Create"}
						</Button>
						<Button type="button" onClick={() => router.back()}>
							Cancel
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export default CreateActivityForm;
