import Button from "@atoms/button";
import DatePickerField from "@atoms/date-picker-field";
import Form from "@atoms/form";
import Input from "@atoms/input";
import TimePicker from "@atoms/time-input";
import Label from "@atoms/label";
import Loading from "@atoms/loading";
import Select from "@atoms/select";
import Subheading from "@atoms/subheading";
import Title from "@atoms/title";
import ButtonGroup from "@molecules/button-group";
import { Client, Invoice, SupportItem } from "@prisma/client";
import InvoiceValidationSchema from "@schema/invoice-validation-schema";
import {
	errorIn,
	fetcher,
	getHighestInvoiceNo,
	getNextInvoiceNo,
	valuesToInvoice,
} from "@utils/helpers";
import axios from "axios";
import dayjs from "dayjs";
import { FieldArray, FormikProps, withFormik } from "formik";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { FC, useEffect, useState } from "react";
import { toast } from "react-toastify";
import useSWR, { SWRResponse, useSWRConfig } from "swr";
import * as Styles from "./styles";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

export type FormActivity = {
	date: string;
	startTime: string;
	endTime: string;
	itemDistance?: string;
	transitDuration?: string;
	transitDistance?: string;
	supportItemId: string;
	id?: string;
};

export type FormValues = Omit<Partial<Invoice>, "date"> & {
	date: string;
	activities: FormActivity[];
};

interface Props {
	initialValues?: FormValues;
	returnFunction?: () => void;
}

const CreateInvoiceForm: FC<Props> = ({ initialValues, returnFunction }) => {
	const router = useRouter();
	const { mutate } = useSWRConfig();

	const {
		data: clients,
		error: cError,
	}: SWRResponse<
		(Client & { invoices: { invoiceNo: string; billTo: string }[] })[]
	> = useSWR("/api/clients", fetcher);

	const { data: supportItems, error: sError }: SWRResponse<SupportItem[]> =
		useSWR("/api/support-items", fetcher);

	if (cError || sError) return <div>An error occurred</div>;
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

	const BaseForm = (props: FormikProps<FormValues>) => {
		const { values, touched, errors, handleChange, handleBlur, handleSubmit } =
			props;

		const [invoiceNoConfirmed, confirmInvoiceNo] = useState(!!initialValues);
		const [billToSource, setBillToSource] = useState<
			"previous invoice" | "client information" | ""
		>();

		useEffect(() => {
			if (values.clientId) {
				const client = clients.find((c) => c.id === values.clientId);

				if (!client) return;

				const highestInvoiceNo = getHighestInvoiceNo(
					client.invoices?.map((index) => index.invoiceNo) ?? []
				);

				values.invoiceNo =
					highestInvoiceNo !== initialValues?.invoiceNo
						? getNextInvoiceNo(
								client.invoices?.map((index) => index.invoiceNo),
								client?.invoicePrefix
						  )
						: highestInvoiceNo;

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

		const getPreviousInvoiceNo = () => {
			const client = clients.find((c) => c.id === values.clientId);

			return client?.invoices?.length
				? getHighestInvoiceNo(client?.invoices?.map((index) => index.invoiceNo))
				: "";
		};

		return (
			<Form onSubmit={handleSubmit} flexDirection="column">
				<Styles.ClientSelect>
					<Label
						htmlFor="clientId"
						className={`highlightable${!values.clientId ? " highlighted" : ""}`}
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
							!invoiceNoConfirmed ? " highlighted" : ""
						}`}
					>
						<Label htmlFor="invoiceNo" required>
							<span>Invoice Number</span>
							<Subheading>
								{getPreviousInvoiceNo()
									? `Previous invoice number was ${getPreviousInvoiceNo()}`
									: "This is the first invoice"}
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

						<Label htmlFor="billTo" required>
							<span>Bill To</span>
							{billToSource ? (
								<Subheading>
									Loaded from <b>{billToSource}</b>
								</Subheading>
							) : (
								<Subheading></Subheading>
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
							primary
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
															{" "}
															<Button
																type="button"
																className="danger"
																onClick={() => arrayHelpers.remove(index)}
															>
																X
															</Button>
														</Label>
													</Styles.ActivityRow>

													<Styles.ActivityRow>
														<Label required>
															<span>Date</span>
															<DatePickerField
																name={`activities.${index}.date`}
															/>
														</Label>

														<Label required>
															<span>Start Time</span>
															<TimePicker
																name={`activities.${index}.startTime`}
															/>
														</Label>

														<Label required>
															<span>End Time</span>
															<TimePicker
																name={`activities.${index}.endTime`}
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
												onClick={() => arrayHelpers.push(emptyActivity)}
												disabled={!values.clientId}
											>
												Add New Activity
											</Button>
										</>
									) : (
										<Button
											type="button"
											onClick={() => arrayHelpers.push(emptyActivity)}
											disabled={!values.clientId}
											primary
										>
											Add New Activity
										</Button>
									)}
								</Styles.ActivityContainer>
							)}
						/>

						{values.activities.length > 0 && (
							<ButtonGroup>
								<Button type="submit" disabled={!values.clientId} primary>
									{initialValues ? "Save" : "Create"}
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

			if (initialValues) {
				axios
					.post(`/api/invoices/${initialValues.id}`, data)
					.then(() => {
						toast.info("Invoice Updated");
						setSubmitting(false);
						mutate(`/api/invoices/${initialValues.id}`);

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
						router.push("/invoices");
					})
					.catch((error) => {
						console.error(error);
						toast.error("An unknown error occured");
					});
			}
		},
		validationSchema: InvoiceValidationSchema,
		validateOnChange: true,
		validateOnMount: false,
		validateOnBlur: true,
		displayName: "Create Invoice",
	})(BaseForm);

	return (
		<Styles.Container>
			<Head>
				<title>
					{initialValues
						? `Updating ${initialValues.invoiceNo}`
						: "Create Invoice"}{" "}
					- Melvin
				</title>
			</Head>
			<Title>
				{initialValues
					? `Updating ${initialValues.invoiceNo}`
					: "Create New Invoice"}
			</Title>
			<InvoiceForm />
		</Styles.Container>
	);
};

export default CreateInvoiceForm;
