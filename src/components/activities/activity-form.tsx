import Button from "@atoms/button";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Label from "@atoms/label";
import Subheading from "@atoms/subheading";
import ClientSelect from "@components/forms/client-select";
import DatePicker from "@components/forms/date-picker";
import ErrorMessage from "@components/forms/error-message";
import Input from "@components/forms/input";
import SupportItemSelect from "@components/forms/support-item-select";
import TimeInput from "@components/forms/time-input";
import { zodResolver } from "@hookform/resolvers/zod";
import { activitySchema, ActivitySchema } from "@schema/activity-schema";
import { ActivityByIdOutput } from "@server/api/routers/activity-router";
import { trpc } from "@utils/trpc";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/customParseFormat"));

interface Props {
	existingActivity?: ActivityByIdOutput;
}

const CreateActivityForm = ({ existingActivity }: Props) => {
	const router = useRouter();

	const trpcContext = trpc.useContext();
	const createActivityMutation = trpc.activity.add.useMutation();
	const modifyActivityMutation = trpc.activity.modify.useMutation();

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isDirty, isSubmitting, isValid },
	} = useForm<ActivitySchema>({
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
			transitDistance: existingActivity?.transitDistance ?? undefined,
			transitDuration: existingActivity?.transitDuration ?? undefined,
		},
	});

	const onSubmit = (data: ActivitySchema) => {
		if (existingActivity?.id) {
			modifyActivityMutation
				.mutateAsync({ id: existingActivity.id, activity: data })
				.then(() => {
					trpcContext.activity.list.invalidate();
					trpcContext.activity.byId.invalidate({ id: existingActivity.id });

					toast.success("Activity updated");
					router.back();
				});
		} else {
			createActivityMutation.mutateAsync({ activity: data }).then(() => {
				trpcContext.activity.list.invalidate();

				toast.success("Activity created");
				router.push("/activities");
			});
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-md flex-col items-center gap-12 p-3">
			<Heading className="">
				{existingActivity ? `Update Activity` : "Log Activity"}
			</Heading>
			<Form
				onSubmit={handleSubmit(onSubmit)}
				className="flex w-full flex-col items-center gap-5"
			>
				<div className="w-full">
					<Label htmlFor="supportItemId" className="shrink grow" required>
						<span>Support Item</span>
						<SupportItemSelect name="supportItemId" control={control} />
						<ErrorMessage error={errors.supportItemId?.message} />
					</Label>
				</div>
				<div className="flex w-full gap-4">
					<Label htmlFor="clientId" className="shrink grow basis-1/2" required>
						<span>Client</span>
						<ClientSelect name="clientId" control={control} />
						<ErrorMessage error={errors.clientId?.message} />
					</Label>
					<Label
						htmlFor="description"
						className="shrink grow basis-1/2"
						required
					>
						<span>Date</span>
						<DatePicker name="date" register={register} error={!!errors.date} />
						<ErrorMessage error={errors.date?.message} />
					</Label>
				</div>

				<div className="flex w-full gap-4">
					<Label
						htmlFor="startTime"
						className="w-full shrink grow basis-1/2"
						required
					>
						<span>Start Time</span>
						<TimeInput
							name="startTime"
							register={register}
							error={!!errors.startTime}
							className="w-full"
						/>
						<ErrorMessage error={errors.startTime?.message} />
					</Label>
					<Label htmlFor="endTime" className="shrink grow basis-1/2" required>
						<span>End Time</span>
						<TimeInput
							name="endTime"
							register={register}
							error={!!errors.endTime}
						/>
						<ErrorMessage error={errors.endTime?.message} />
					</Label>
				</div>
				<hr className="w-full" />

				<div className="flex flex-col items-center gap-1">
					<Heading size="xsmall">Provider Travel</Heading>

					{/* TODO: Autofill from previous invoice */}
					{true && <p>Autofilled from previous invoice</p>}

					<div className="mt-4 flex w-full gap-4">
						<Label
							htmlFor="transitDistance"
							className="w-full shrink grow basis-1/2"
						>
							<span>Transit Distance</span>
							<Subheading>Distance to client&#39;s house</Subheading>
							<Input
								name="transitDistance"
								register={register}
								suffix="km"
								rules={{
									setValueAs: (value) => (value === "" ? null : Number(value)),
								}}
								error={!!errors.transitDistance}
							/>
							<ErrorMessage error={errors.transitDistance?.message} />
						</Label>
						<Label htmlFor="transitDuration" className="shrink grow basis-1/2">
							<span>Transit Duration</span>
							<Subheading>Duration of drive</Subheading>
							<Input
								name="transitDuration"
								register={register}
								suffix="mins"
								rules={{
									setValueAs: (value) => (value === "" ? null : Number(value)),
								}}
								error={!!errors.transitDuration}
							/>
							<ErrorMessage error={errors.transitDuration?.message} />
						</Label>
					</div>
				</div>

				<div className="btn-group">
					<Button
						type="submit"
						variant="primary"
						disabled={isSubmitting || !isDirty || !isValid}
					>
						{existingActivity ? "Update" : "Create"}
					</Button>
					<Button type="button" onClick={() => router.back()}>
						Cancel
					</Button>
				</div>
			</Form>
		</div>
	);
};

export default CreateActivityForm;
