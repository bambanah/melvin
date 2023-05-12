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
		getValues,
		setValue,
		formState: { errors, isDirty, isSubmitting, isValid },
	} = useForm<InvoiceSchema>({
		resolver: zodResolver(invoiceSchema),
		defaultValues: {
			...initialValues,
			clientId: initialValues?.clientId ?? "",
			date: initialValues?.date ?? dayjs().format("YYYY-MM-DD"),
			invoiceNo: initialValues?.invoiceNo ?? "",
			billTo: initialValues?.billTo ?? "",
			activityIds: initialValues?.activities.map((a) => a.id) ?? [],
		},
	});

	const { data: { activities } = {} } = trpc.activity.list.useQuery({
		clientId: watch("clientId"),
		assigned: false,
	});

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-3">
			<Heading className="border-b pb-4">Create Invoice</Heading>
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
							error={!!errors.date}
						/>
						<ErrorMessage error={errors.date?.message} />
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
										<div className="flex flex-col gap-2 pl-1 md:pl-4">
											<p className="font-semibold">
												{activity.supportItem.description}
											</p>
											<div className="flex justify-between text-sm md:gap-6 md:text-sm">
												<span className="basis-1/2">
													<FontAwesomeIcon icon={faCalendar} />{" "}
													{dayjs.utc(activity.date).format("dddd DD/MM")}
												</span>
												<span className="basis-1/2">
													<FontAwesomeIcon icon={faClock} />{" "}
													{dayjs(activity.startTime).format("h:mma")}-
													{dayjs(activity.endTime).format("h:mma")}
												</span>
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
						variant="success"
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
