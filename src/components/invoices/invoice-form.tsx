import Button from "@atoms/button";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Label from "@atoms/label";
import Subheading from "@atoms/subheading";
import ClientSelect from "@components/forms/client-select";
import ErrorMessage from "@components/forms/error-message";
import Input from "@components/forms/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceSchema, InvoiceSchema } from "@schema/invoice-schema";
import { InvoiceByIdOutput } from "@server/api/routers/invoice-router";
import { trpc } from "@utils/trpc";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

interface Props {
	onSubmit: (invoiceData: InvoiceSchema) => void;
	initialValues?: InvoiceByIdOutput;
}

const InvoiceForm = ({ initialValues, onSubmit }: Props) => {
	const router = useRouter();

	const {
		register,
		handleSubmit,
		control,
		watch,
		formState: { errors, isDirty, isSubmitting, isValid },
	} = useForm<InvoiceSchema>({
		resolver: zodResolver(invoiceSchema),
		defaultValues: {
			...initialValues,
			clientId: initialValues?.clientId ?? "",
			date: initialValues?.date ?? dayjs().format("YYYY-MM-DD"),
			invoiceNo: initialValues?.invoiceNo ?? "",
			billTo: initialValues?.billTo ?? "",
		},
	});

	const { data: { activities } = {} } = trpc.activity.list.useQuery({
		clientId: watch("clientId"),
		assigned: false,
	});

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
			<Heading>Create Invoice</Heading>
			<Form onSubmit={handleSubmit(onSubmit)}>
				<div className="flex flex-col gap-6 md:flex-row">
					<Label className="basis-1/2" required>
						<span>Client</span>
						<Subheading>Who will this invoice be for?</Subheading>
						<ClientSelect control={control} name="clientId" />
						<ErrorMessage error={errors.clientId?.message} />
					</Label>

					<Label className="basis-1/2" required>
						<span>Invoice Number</span>
						<Subheading>Previous invoice was XXX</Subheading>
						<Input
							name="invoiceNo"
							placeholder={"Smith-XX"}
							register={register}
						/>
						<ErrorMessage error={errors.invoiceNo?.message} />
					</Label>
				</div>
				<div className="flex flex-col gap-6 md:flex-row">
					<Label className="basis-1/2">
						<span>Bill To</span>
						<Subheading>Loaded from client information</Subheading>
						<Input name="billTo" register={register} />
						<ErrorMessage error={errors.billTo?.message} />
					</Label>
					<Label className="basis-1/2">
						<span>Date</span>
						<Subheading>Date to display on invoice</Subheading>
						<Input
							name="date"
							type="date"
							register={register}
							rules={
								{
									// setValueAs: (value) => (value === "" ? null : new Date(value)),
								}
							}
							error={!!errors.date}
						/>
						<ErrorMessage error={errors.date?.message} />
					</Label>
				</div>

				{watch("clientId") && activities && (
					<div className="flex flex-col gap-2">
						<Heading size="small">Unassigned Activities</Heading>

						{activities.length > 0 ? (
							activities.map((activity) => (
								<div key={activity.id}>
									<h2>{dayjs.utc(activity.date).format()}</h2>
								</div>
							))
						) : (
							<p>Nothing</p>
						)}
					</div>
				)}

				<div className="btn-group">
					<Button
						type="submit"
						variant="primary"
						disabled={!isDirty || !isValid || isSubmitting}
					>
						Create
					</Button>
					<Button type="button" onClick={() => router.back()}>
						Cancel
					</Button>
				</div>
			</Form>
		</div>
	);
};

export default InvoiceForm;
