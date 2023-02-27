import Button from "@atoms/button";
import ButtonGroup from "@atoms/button-group";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Label from "@atoms/label";
import Loading from "@atoms/loading";
import Subheading from "@atoms/subheading";
import Input from "@components/forms/input-formik";
import Select from "@components/forms/select-formik";
import TimePicker from "@components/forms/time-input-formik";
import { faTrashAlt } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Invoice } from "@prisma/client";
import InvoiceValidationSchema from "@schema/invoice-validation-schema";
import {
	errorIn,
	getHighestInvoiceNo,
	getNextInvoiceNo,
	valuesToInvoice,
} from "@utils/helpers";
import { trpc } from "@utils/trpc";
import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { FieldArray, FormikProps, withFormik } from "formik";
import Head from "next/head";
import { useRouter } from "next/router";
import { FC, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSWRConfig } from "swr";
import * as Styles from "./styles";
dayjs.extend(customParseFormat);

export type FormActivity = {
	date?: string;
	startTime: string;
	endTime: string;
	itemDistance?: string;
	transitDuration?: string;
	transitDistance?: string;
	supportItemId: string;
	id?: string;
};

export type FormValues = Omit<Partial<Invoice>, "date"> & {
	date?: string;
	activities: FormActivity[];
};

interface Props {
	initialValues?: FormValues;
	returnFunction?: () => void;
	copiedFrom?: string;
}

const CreateInvoiceForm: FC<Props> = ({
	initialValues,
	returnFunction,
	copiedFrom,
}) => {
	const router = useRouter();
	const { mutate } = useSWRConfig();

	// Get clients and support items
	const { data: { clients } = {}, error: clientError } =
		trpc.clients.list.useQuery({});

	const { data: { supportItems } = {}, error: supportItemError } =
		trpc.supportItem.list.useQuery({});
	const trpcContext = trpc.useContext();

	if (clientError || supportItemError) return <div>An error occurred</div>;
	if (!clients || !supportItems) return <Loading />;

	const emptyActivity: FormActivity = {
		date: "",
		startTime: "",
		endTime: "",
		itemDistance: "",
		transitDistance: "",
		transitDuration: "",
		supportItemId: "",
	};

	const activitiesToDelete: string[] = [];

	const title =
		router.query.edit && initialValues
			? `Updating ${initialValues.invoiceNo}`
			: "Creating new invoice";

	const BaseForm = (props: FormikProps<FormValues>) => {
		const { values, touched, errors, handleChange, handleBlur, handleSubmit } =
			props;

		const [invoiceNoConfirmed, confirmInvoiceNo] = useState(!!initialValues);
		const [billToSource, setBillToSource] = useState<
			"previous invoice" | "client information" | ""
		>();

		const getPreviousInvoiceNo = () => {
			const client = clients.find((c) => c.id === values.clientId);

			return client?.invoices?.length
				? getHighestInvoiceNo(client?.invoices?.map((index) => index.invoiceNo))
				: "";
		};

		useEffect(() => {
			if (values.clientId) {
				const client = clients.find((c) => c.id === values.clientId);

				if (!client) return;

				const highestInvoiceNo = getHighestInvoiceNo(
					client.invoices?.map((index) => index.invoiceNo) ?? []
				);

				if (!initialValues?.invoiceNo) {
					values.invoiceNo =
						highestInvoiceNo === initialValues?.invoiceNo
							? highestInvoiceNo ?? ""
							: getNextInvoiceNo(
									client.invoices?.map((index) => index.invoiceNo),
									client.invoiceNumberPrefix
							  );
				}

				if (client.billTo) {
					setBillToSource("client information");
					values.billTo = client.billTo;
				} else if (
					client.invoices?.find((index) => index.invoiceNo === highestInvoiceNo)
						?.billTo
				) {
					setBillToSource("previous invoice");
					values.billTo = client.invoices?.find(
						(index) => index.invoiceNo === highestInvoiceNo
					)?.billTo;
				} else {
					setBillToSource("");
					values.billTo = "";
				}
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [values.clientId]);

		return (
			<Form onSubmit={handleSubmit}>
				<Styles.ClientSelect>
					<Label
						htmlFor="clientId"
						className={`highlightable${values.clientId ? "" : " highlighted"}`}
					>
						<Subheading>Who will this invoice be for?</Subheading>
						<Select
							name="clientId"
							error={errorIn(errors, touched, "clientId")}
							options={clients.map((client) => ({
								value: client.id,
								label: client.name,
							}))}
						/>
					</Label>
				</Styles.ClientSelect>

				{values.clientId && (
					<Styles.ClientDetails
						className={`highlightable${
							invoiceNoConfirmed ? "" : " highlighted"
						}`}
					>
						<Label htmlFor="invoiceNo" required>
							<span>Invoice Number</span>
							<Subheading>
								{initialValues?.invoiceNo ? (
									copiedFrom ? (
										<>
											Previous invoice was <b>{copiedFrom}</b>
										</>
									) : (
										"Update if required"
									)
								) : getPreviousInvoiceNo() ? (
									<>
										Previous invoice was <b>{getPreviousInvoiceNo()}</b>
									</>
								) : (
									"This is the first invoice"
								)}
							</Subheading>
							<Input
								type="text"
								onChange={handleChange}
								onBlur={handleBlur}
								value={values.invoiceNo}
								name="invoiceNo"
								id="invoiceNo"
								error={errorIn(errors, touched, "invoiceNo")}
							/>
						</Label>

						<Label htmlFor="billTo">
							<span>Bill To</span>
							{billToSource ? (
								<Subheading>
									{initialValues?.billTo ? (
										"Update if required"
									) : (
										<>
											Loaded from <b>{billToSource}</b>
										</>
									)}
								</Subheading>
							) : (
								<Subheading>Leave blank if required</Subheading>
							)}
							<Input
								type="text"
								onChange={handleChange}
								onBlur={handleBlur}
								value={values.billTo}
								name="billTo"
								id="billTo"
								error={errorIn(errors, touched, "billTo")}
							/>
						</Label>
					</Styles.ClientDetails>
				)}

				{values.clientId && !invoiceNoConfirmed && (
					<Styles.ConfirmClientDetails>
						<h2>Do these details look correct?</h2>
						<span>You can manually edit them at any time</span>
						<Button
							type="button"
							onClick={() => confirmInvoiceNo(true)}
							variant="primary"
						>
							Confirm
						</Button>
					</Styles.ConfirmClientDetails>
				)}

				{invoiceNoConfirmed && (
					<>
						<FieldArray
							name="activities"
							render={(arrayHelpers) => (
								<Styles.ActivityContainer>
									{values.activities && values.activities.length > 0 ? (
										<>
											{values.activities.map((activity, index) => (
												<Styles.Activity key={index}>
													<Styles.ActivityRow>
														<Label>
															<h3>Activity {index + 1}</h3>
															<Select
																name={`activities.${index}.supportItemId`}
																error={errorIn(
																	errors,
																	touched,
																	`activities.${index}.supportItemId`
																)}
																options={supportItems.map((supportItem) => ({
																	value: supportItem.id,
																	label: supportItem.description,
																}))}
															/>
														</Label>
														<Label className="delete-button">
															<Button
																type="button"
																variant="danger"
																onClick={() => {
																	if (activity.id) {
																		activitiesToDelete.push(activity.id);
																	}
																	arrayHelpers.remove(index);
																}}
															>
																<FontAwesomeIcon icon={faTrashAlt} />
															</Button>
														</Label>
													</Styles.ActivityRow>

													<Styles.ActivityRow>
														<Label required>
															<span>Date</span>
															<Input
																type="date"
																onChange={handleChange}
																onBlur={handleBlur}
																value={values.activities[index].date}
																id={`activities.${index}.date`}
																name={`activities.${index}.date`}
																error={errorIn(
																	errors,
																	touched,
																	`activities.${index}.date`
																)}
															/>
														</Label>

														<Label required>
															<span>Start Time</span>
															<TimePicker
																name={`activities.${index}.startTime`}
																error={errorIn(
																	errors,
																	touched,
																	`activities.${index}.startTime`
																)}
															/>
														</Label>

														<Label required>
															<span>End Time</span>
															<TimePicker
																name={`activities.${index}.endTime`}
																error={errorIn(
																	errors,
																	touched,
																	`activities.${index}.endTime`
																)}
															/>
														</Label>
													</Styles.ActivityRow>

													<Styles.ActivityRow>
														<Label
															htmlFor={`activities.${index}.transitDistance`}
														>
															<span>Transit Distance</span>
															<Input
																type="text"
																onChange={handleChange}
																onBlur={handleBlur}
																value={values.activities[index].transitDistance}
																name={`activities.${index}.transitDistance`}
																id={`activities.${index}.transitDistance`}
																error={errorIn(
																	errors,
																	touched,
																	`activities.${index}.transitDistance`
																)}
																suffix="km"
															/>
														</Label>

														<Label
															htmlFor={`activities.${index}.transitDuration`}
														>
															<span>Transit Duration</span>
															<Input
																type="text"
																onChange={handleChange}
																onBlur={handleBlur}
																value={values.activities[index].transitDuration}
																name={`activities.${index}.transitDuration`}
																id={`activities.${index}.transitDuration`}
																error={errorIn(
																	errors,
																	touched,
																	`activities.${index}.transitDuration`
																)}
																suffix="minutes"
															/>
														</Label>
													</Styles.ActivityRow>
												</Styles.Activity>
											))}

											<Button
												type="button"
												onClick={() =>
													arrayHelpers.push({
														...values.activities[values.activities.length - 1],
														id: undefined,
													})
												}
												disabled={!values.clientId}
												variant="secondary"
											>
												Add New Activity
											</Button>
										</>
									) : (
										<Button
											type="button"
											onClick={() => arrayHelpers.push(emptyActivity)}
											disabled={!values.clientId}
											variant="primary"
										>
											Add New Activity
										</Button>
									)}
								</Styles.ActivityContainer>
							)}
						/>

						{values.activities.length > 0 && (
							<ButtonGroup>
								<Button
									type="submit"
									disabled={!values.clientId}
									variant="primary"
								>
									{router.query.edit ? "Update" : "Create"}
								</Button>
								<Button
									type="button"
									disabled={!values.clientId}
									onClick={() => {
										returnFunction
											? returnFunction()
											: router.push("/invoices");
									}}
								>
									Cancel
								</Button>
							</ButtonGroup>
						)}
					</>
				)}
			</Form>
		);
	};

	const InvoiceForm = withFormik({
		mapPropsToValues: () => {
			return {
				id: initialValues?.id ?? undefined,
				date: initialValues?.date ?? "",
				invoiceNo: initialValues?.invoiceNo ?? "",
				clientId: initialValues?.clientId ?? "",
				billTo: initialValues?.billTo ?? "",
				activities: initialValues?.activities ?? [emptyActivity],
			} as FormValues;
		},
		handleSubmit: (values, { setSubmitting }) => {
			const data = valuesToInvoice(values);
			if (initialValues?.id) {
				axios
					.post(`/api/invoices/${initialValues.id}`, {
						...data,
						activitiesToDelete,
					})
					.then(() => {
						toast.info("Invoice Updated");
						setSubmitting(false);
						mutate(`/api/invoices/${initialValues.id}`);
						trpcContext.invoice.list.invalidate();
						trpcContext.invoice.byId.invalidate({ id: initialValues.id });

						returnFunction ? returnFunction() : router.push("/invoices");
					})
					.catch((error) => {
						console.error(error);
						toast.error("An unknown error occured");
					});
			} else {
				axios
					.post("/api/invoices", data)
					.then(() => {
						toast.success("Invoice Created");
						setSubmitting(false);
						mutate("/api/invoices");
						trpcContext.invoice.list.invalidate();

						router.push("/invoices");
					})
					.catch((error) => {
						console.error(error);
						toast.error("An unknown error occured");
					});
			}
		},
		validationSchema: InvoiceValidationSchema,
		validateOnChange: false,
		validateOnMount: false,
		validateOnBlur: true,
		displayName: "Create Invoice",
	})(BaseForm);

	return (
		<Styles.Container>
			<Head>
				<title>{title} - Melvin</title>
			</Head>
			<Heading>{title}</Heading>
			<InvoiceForm />
		</Styles.Container>
	);
};

export default CreateInvoiceForm;
