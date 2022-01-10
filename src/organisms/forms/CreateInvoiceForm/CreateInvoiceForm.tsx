import Button from "@atoms/Button";
import DatePickerField from "@atoms/DatePickerField";
import Form from "@atoms/Form";
import Input from "@atoms/Input/Input";
import Label from "@atoms/Label";
import Select from "@atoms/Select";
import TimePicker from "@atoms/invoices/TimeInput";
import Title from "@atoms/Title";
import { Client, Invoice, SupportItem } from "@prisma/client";
import InvoiceValidationSchema from "@schema/InvoiceValidationSchema";
import { errorIn, getDuration } from "@utils/helpers";
import axios from "axios";
import { FieldArray, FormikProps, withFormik } from "formik";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as Styles from "./styles";
import ButtonGroup from "@molecules/ButtonGroup";
import Subheading from "@atoms/Subheading";
import { mutate } from "swr";

interface CreateInvoiceFormProps {
	clients: Client[];
	supportItems: SupportItem[];
}

type FormActivity = {
	date: string;
	startTime: string;
	endTime: string;
	itemDistance?: string;
	transitDuration?: string;
	transitDistance?: string;
};

type FormValues = Partial<Invoice> & {
	activities: FormActivity[];
};

const CreateInvoiceForm = ({
	clients,
	supportItems,
}: CreateInvoiceFormProps) => {
	const router = useRouter();

	const emptyActivity: FormActivity = {
		date: "",
		startTime: "",
		endTime: "",
		itemDistance: "",
		transitDistance: "",
		transitDuration: "",
	};

	const BaseForm = (props: FormikProps<FormValues>) => {
		const { values, touched, errors, handleChange, handleBlur, handleSubmit } =
			props;

		const [invoiceNoConfirmed, confirmInvoiceNo] = useState(false);

		useEffect(() => {
			if (values.clientId) {
				values.billTo =
					clients.find((c) => c.id === values.clientId)?.billTo ?? "";

				const invoicePrefix = clients.find(
					(c) => c.id === values.clientId
				)?.invoicePrefix;

				if (invoicePrefix) {
					const invoiceNo = values.invoiceNo?.split("-").at(-1);
					if (invoiceNo) {
						values.invoiceNo = invoicePrefix + "-" + invoiceNo;
					} else {
						values.invoiceNo = invoicePrefix + "-";
					}
				}
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [values.clientId]);

		return (
			<Styles.Container>
				<Title>Create New Invoice</Title>
				<Form onSubmit={handleSubmit} flexDirection="column">
					<Styles.ClientSelect>
						<Label
							htmlFor="clientId"
							className={`highlightable${
								!values.clientId ? " highlighted" : ""
							}`}
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
								<Subheading>Previous invoice number was Gawne26</Subheading>
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
								<Subheading>Loaded from client information</Subheading>
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
																	value={
																		values.activities[index].transitDistance
																	}
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
																	value={
																		values.activities[index].transitDuration
																	}
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
										Create
									</Button>
									<Button
										type="button"
										disabled={!values.clientId}
										onClick={() => {
											router.push("/invoices");
										}}
									>
										Cancel
									</Button>
								</ButtonGroup>
							)}
						</>
					)}
				</Form>
			</Styles.Container>
		);
	};

	const InvoiceForm = withFormik({
		mapPropsToValues: () =>
			({
				invoiceNo: "",
				clientId: "",
				billTo: "",
				activities: [],
			} as FormValues),
		handleSubmit: (values, { setSubmitting }) => {
			const data = {
				invoice: {
					invoiceNo: values.invoiceNo,
					clientId: values.clientId,
					billTo: values.billTo,
					date: new Date(),
				},
				activities: values.activities.map((activity) => ({
					...activity,
					itemDuration: getDuration(activity.startTime, activity.endTime),
					itemDistance: Number(activity.itemDistance) || null,
					transitDistance: Number(activity.transitDistance) || null,
					transitDuration: Number(activity.transitDistance) || null,
					startTime: new Date("1970-01-01T" + activity.startTime + "Z"),
					endTime: new Date("1970-01-01T" + activity.endTime + "Z"),
				})),
			};

			axios.post("/api/invoices", data).then(() => {
				toast.success("Invoice Created");
			});

			setSubmitting(false);
			mutate("/api/invoices");
			router.push("/invoices");
		},
		validationSchema: InvoiceValidationSchema,
		validateOnChange: true,
		validateOnMount: false,
		validateOnBlur: true,
		displayName: "Create Invoice",
	})(BaseForm);

	return <InvoiceForm />;
};

export default CreateInvoiceForm;
