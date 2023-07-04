import Button from "@atoms/button";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Label from "@atoms/label";
import Subheading from "@atoms/subheading";
import ClientSelect from "@components/forms/client-select";
import ErrorMessage from "@components/forms/error-message";
import Input from "@components/forms/input";
import { faCalendar, faClock } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceSchema, InvoiceSchema } from "@schema/invoice-schema";
import { InvoiceByIdOutput } from "@server/api/routers/invoice-router";
import { trpc } from "@utils/trpc";
import classNames from "classnames";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { faCar } from "@fortawesome/free-solid-svg-icons";
dayjs.extend(utc);

interface Props {
	onSubmit: (invoiceData: InvoiceSchema) => void;
	existingInvoice?: InvoiceByIdOutput;
}

const InvoiceForm = ({ existingInvoice, onSubmit }: Props) => {
	const router = useRouter();

	const {
		register,
		handleSubmit,
		control,
		watch,
		getValues,
		setValue,
		formState: { errors, isDirty, isSubmitting, isValid },
	} = useForm<InvoiceSchema>({
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

	const clientId = watch("clientId");
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
			setValue("invoiceNo", nextInvoiceNo, { shouldValidate: true });
		setValue("billTo", billTo ?? "", { shouldValidate: true });
	}, [billTo, existingInvoice, nextInvoiceNo, setValue]);

	const { data: { activities } = {} } = trpc.activity.list.useQuery({
		clientId: watch("clientId"),
		assigned: false,
	});

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-3">
			<Heading className="border-b pb-4">
				{existingInvoice
					? `Updating ${existingInvoice.invoiceNo}`
					: "Create Invoice"}
			</Heading>
			<Form onSubmit={handleSubmit(onSubmit)}>
				<div className="flex flex-col gap-6 md:flex-row">
					<Label className="basis-1/2" required>
						<span>Client</span>
						<Subheading>Who will this invoice be for?</Subheading>
						<ClientSelect control={control} name="clientId" />
						<ErrorMessage error={errors.clientId?.message} />
					</Label>

					<Label className="basis-1/2">
						<span>Date</span>
						<Subheading>Date to display on invoice</Subheading>
						<Input
							name="date"
							type="date"
							register={register}
							error={!!errors.date}
						/>
						<ErrorMessage error={errors.date?.message} />
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
						<Input name="billTo" register={register} />
						<ErrorMessage error={errors.billTo?.message} />
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
							register={register}
						/>
						<ErrorMessage error={errors.invoiceNo?.message} />
					</Label>
				</div>

				{watch("clientId") && activities && (
					<div className="flex flex-col gap-2">
						<Heading size="xsmall">Unassigned Activities</Heading>

						<div className="flex flex-col gap-2">
							{activities.length > 0 ? (
								activities.map((activity) => (
									<label
										key={activity.id}
										className={classNames([
											"flex cursor-pointer gap-2 rounded-md border px-2 py-3 shadow-md transition-shadow hover:border-indigo-500 md:p-4",
											getValues("activityIds")?.some((c) => c === activity.id)
												? "border-indigo-500 bg-indigo-100"
												: "bg-white",
										])}
										htmlFor={activity.id}
									>
										<input
											id={activity.id}
											type="checkbox"
											checked={getValues("activityIds")?.some(
												(c) => c === activity.id
											)}
											onChange={(val) => {
												if (val.target.checked) {
													const activityIds = getValues("activityIds") ?? [];
													setValue(
														"activityIds",
														[...activityIds, activity.id],
														{ shouldTouch: true, shouldValidate: true }
													);
												} else {
													setValue(
														"activityIds",
														getValues("activityIds")?.filter(
															(v) => v !== activity.id
														) ?? [],
														{ shouldTouch: true, shouldValidate: true }
													);
												}
											}}
											className="w-5 cursor-pointer border bg-white outline-none ring-0"
										/>
										<div className="flex w-full flex-col gap-2 pl-1 md:pl-4">
											<p className="font-semibold">
												{activity.supportItem.description}
											</p>
											<div className="flex justify-start gap-6 text-sm md:text-sm">
												<span>
													<FontAwesomeIcon icon={faCalendar} />{" "}
													{dayjs.utc(activity.date).format("dddd DD/MM")}
												</span>
												{activity.startTime ? (
													<span className="">
														<FontAwesomeIcon icon={faClock} />{" "}
														{dayjs.utc(activity.startTime).format("h:mma")}-
														{dayjs.utc(activity.endTime).format("h:mma")}
													</span>
												) : (
													<span className="">
														<FontAwesomeIcon icon={faCar} />{" "}
														{activity.itemDistance} km
													</span>
												)}
											</div>
										</div>
									</label>
								))
							) : (
								<p>Nothing</p>
							)}
						</div>
					</div>
				)}

				<div className="btn-group">
					<Button
						type="submit"
						variant="primary"
						disabled={!isDirty || !isValid || isSubmitting}
					>
						{existingInvoice ? "Update" : "Create"}
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
