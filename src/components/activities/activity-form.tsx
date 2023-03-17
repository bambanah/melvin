import Button from "@atoms/button";
import Form from "@atoms/form";
import Label from "@atoms/label";
import ClientSelect from "@components/forms/client-select";
import ErrorMessage from "@components/forms/error-message";
import Input from "@components/forms/input";
import SupportItemSelect from "@components/forms/support-item-select";
import { zodResolver } from "@hookform/resolvers/zod";
import { activitySchema, ActivitySchema } from "@schema/activity-schema";
import { ActivityByIdOutput } from "@server/routers/activity-router";
import { trpc } from "@utils/trpc";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import TimeInput from "@components/forms/time-input";
import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/customParseFormat"));

interface Props {
	existingActivity?: ActivityByIdOutput;
}

const InputRow = ({ children }: { children: React.ReactNode }) => (
	<div className="flex w-full max-w-full content-center gap-4">{children}</div>
);

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
	});

	const onSubmit = (data: ActivitySchema) => {
		if (existingActivity?.id) {
			modifyActivityMutation
				.mutateAsync({ id: existingActivity.id, activity: data })
				.then(() => {
					trpcContext.activity.list.invalidate();
					trpcContext.activity.byId.invalidate({ id: existingActivity.id });

					toast.success("Activity updated");
					router.push("/activities");
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
		<div className="flex flex-col items-center gap-12 self-center px-12">
			<h2 className="m-0 flex-shrink flex-grow-0 basis-full text-2xl font-bold">
				{existingActivity ? `Updating Activity` : "Create New Activity"}
			</h2>
			<Form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl gap-12">
				<InputRow>
					<Label
						htmlFor="clientId"
						className="shrink-0 grow-0 basis-1/2"
						required
					>
						<span>Client</span>
						<ClientSelect name="clientId" control={control} />
						<ErrorMessage error={errors.clientId?.message} />
					</Label>
					<Label
						htmlFor="supportItemId"
						className="shrink-0 grow-0 basis-1/2"
						required
					>
						<span>Support Item</span>
						<SupportItemSelect name="supportItemId" control={control} />
						<ErrorMessage error={errors.supportItemId?.message} />
					</Label>
				</InputRow>

				<InputRow>
					<Label
						htmlFor="description"
						className="shrink-1 grow-1 basis-1/3"
						required
					>
						<span>Date</span>
						<Input
							name="date"
							type="date"
							register={register}
							rules={{ valueAsDate: true }}
							error={!!errors.date}
						/>
						<ErrorMessage error={errors.date?.message} />
					</Label>
					<Label
						htmlFor="startTime"
						className="grow-1 shrink-1 basis-1/3"
						required
					>
						<span>Start Time</span>
						<TimeInput
							name="startTime"
							register={register}
							error={!!errors.startTime}
						/>
						<ErrorMessage error={errors.startTime?.message} />
					</Label>
					<Label
						htmlFor="endTime"
						className="grow-1 shrink-1 basis-1/3"
						required
					>
						<span>End Time</span>
						<TimeInput
							name="endTime"
							register={register}
							error={!!errors.endTime}
						/>
						<ErrorMessage error={errors.endTime?.message} />
					</Label>
				</InputRow>

				<div className="btn-group">
					<Button
						type="submit"
						variant="primary"
						disabled={isSubmitting || !isDirty || !isValid}
					>
						{existingActivity ? "Update" : "Create"}
					</Button>
					<Link href="/activities">Cancel</Link>
				</div>
			</Form>
		</div>
	);
};

export default CreateActivityForm;
