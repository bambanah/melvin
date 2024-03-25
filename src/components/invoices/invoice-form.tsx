import ClientSelect from "@/components/forms/client-select";
import ErrorMessage from "@/components/forms/error-message";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Heading from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import Label from "@/components/ui/label-old";
import Subheading from "@/components/ui/subheading";
import { trpc } from "@/lib/trpc";
import { InvoiceSchema, invoiceSchema } from "@/schema/invoice-schema";
import { InvoiceByIdOutput } from "@/server/api/routers/invoice-router";
import { zodResolver } from "@hookform/resolvers/zod";
import classNames from "classnames";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import InvoiceActivityCreationForm from "./invoice-activity-creation-form";
import UnassignedActivities from "./unnassigned-activities";

dayjs.extend(utc);

interface Props {
	onSubmit: (invoiceData: InvoiceSchema) => void;
	existingInvoice?: InvoiceByIdOutput;
}

const InvoiceForm = ({ existingInvoice, onSubmit }: Props) => {
	const router = useRouter();

	const form = useForm<InvoiceSchema>({
		resolver: zodResolver(invoiceSchema),
		defaultValues: {
			...existingInvoice,
			clientId: existingInvoice?.clientId ?? "",
			date: existingInvoice?.date ?? dayjs().format("YYYY-MM-DD"),
			invoiceNo: existingInvoice?.invoiceNo ?? "",
			billTo: existingInvoice?.billTo ?? "",
			activityIds: existingInvoice?.activities.map((a) => a.id) ?? [],
		},
	});

	const clientId = form.watch("clientId");
	const { data: billTo, refetch: refetchBillTo } =
		trpc.clients.getBillTo.useQuery(
			{
				id: clientId,
			},
			{ enabled: false }
		);
	const {
		data: { nextInvoiceNo, latestInvoiceNo } = {},
		refetch: refetchNextInvoiceNo,
	} = trpc.clients.getNextInvoiceNo.useQuery(
		{
			id: clientId,
		},
		{ enabled: false }
	);

	useEffect(() => {
		if (clientId) {
			refetchBillTo();
			refetchNextInvoiceNo();
		}
	}, [clientId, refetchBillTo, refetchNextInvoiceNo]);

	useEffect(() => {
		if (nextInvoiceNo && !existingInvoice)
			form.setValue("invoiceNo", nextInvoiceNo, { shouldValidate: true });

		form.setValue("billTo", billTo ?? "", { shouldValidate: true });
	}, [billTo, existingInvoice, form, nextInvoiceNo]);

	const { data: { activities } = {} } = trpc.activity.list.useQuery({
		clientId: form.watch("clientId"),
		assigned: false,
	});

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-3">
			<Heading className="pb-4">
				{existingInvoice
					? `Updating ${existingInvoice.invoiceNo}`
					: "Create Invoice"}
			</Heading>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<div className="flex flex-col gap-6 md:flex-row">
						<Label className="basis-1/2" required>
							<span>Client</span>
							<Subheading>Who will this invoice be for?</Subheading>
							<ClientSelect control={form.control} name="clientId" />
							<ErrorMessage error={form.formState.errors.clientId?.message} />
						</Label>

						<Label className="basis-1/2">
							<span>Date</span>
							<Subheading>Date to display on invoice</Subheading>
							<Input name="date" type="date" register={form.register} />
							<ErrorMessage error={form.formState.errors.date?.message} />
						</Label>
					</div>
					<div className="flex flex-col gap-6 md:flex-row">
						<Label className="basis-1/2">
							<span>Bill To</span>
							<Subheading
								className={classNames([
									"overflow-y-hidden transition-[max-height] duration-500 ease-in-out",
									billTo ? "max-h-5" : "max-h-0",
								])}
							>
								{billTo ? "Loaded from client information" : <br />}
							</Subheading>
							<Input name="billTo" register={form.register} />
							<ErrorMessage error={form.formState.errors.billTo?.message} />
						</Label>
						<Label className="basis-1/2" required>
							<span>Invoice Number</span>

							<Subheading
								className={classNames([
									"overflow-y-hidden transition-[max-height] duration-500 ease-in-out",
									billTo ? "max-h-5" : "max-h-0",
								])}
							>
								Previous invoice was {latestInvoiceNo}
							</Subheading>

							<Input
								name="invoiceNo"
								placeholder={"Smith-XX"}
								register={form.register}
							/>
							<ErrorMessage error={form.formState.errors.invoiceNo?.message} />
						</Label>
					</div>

					{form.watch("clientId") && !!activities?.length && (
						<UnassignedActivities
							activities={activities}
							setValue={form.setValue}
							getValues={form.getValues}
						/>
					)}

					<InvoiceActivityCreationForm
						control={form.control}
						register={form.register}
						getValues={form.getValues}
						setValue={form.setValue}
						watch={form.watch}
					/>

					<div className="mt-4 flex justify-center gap-4">
						<Button
							type="submit"
							disabled={
								!form.formState.isDirty ||
								!form.formState.isValid ||
								form.formState.isSubmitting
							}
						>
							{existingInvoice ? "Update" : "Create"}
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

export default InvoiceForm;
