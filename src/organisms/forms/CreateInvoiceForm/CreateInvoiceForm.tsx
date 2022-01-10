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
import { errorIn } from "@utils/helpers";
import axios from "axios";
import { FieldArray, FormikProps, withFormik } from "formik";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as Styles from "./styles";
import { CodeBlock, dracula } from "react-code-blocks";
import ButtonGroup from "@molecules/ButtonGroup";
import Subheading from "@atoms/Subheading";

interface CreateInvoiceFormProps {
	clients: Client[];
	supportItems: SupportItem[];
}

type FormActivity = {
	date: string;
	startTime: string;
	endTime: string;
	itemDuration: string;
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
		itemDuration: "",
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
							required
						>
							<span>Client</span>
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
														<DatePickerField
															name={`activities.${index}.startDate`}
														/>
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
														<Label
															htmlFor={`activities.${index}.itemDuration`}
															required
														>
															<span>Duration</span>
															<Input
																type="text"
																onChange={handleChange}
																onBlur={handleBlur}
																value={values.activities[index].itemDuration}
																name={`activities.${index}.itemDuration`}
																id={`activities.${index}.itemDuration`}
																error={errorIn(
																	errors,
																	touched,
																	`activities.${index}.itemDuration`
																)}
															/>
														</Label>

														<Label
															htmlFor={`activities.${index}.transitDistance`}
															required
														>
															<span>Start Time</span>
															<TimePicker
																name={`activities.${index}.startTime`}
															/>
														</Label>
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

					<Styles.Debug>
						<CodeBlock
							text={JSON.stringify(values, null, 2)}
							language="json"
							showLineNumbers={true}
							theme={dracula}
						/>
						<CodeBlock
							text={JSON.stringify(errors, null, 2)}
							language="json"
							showLineNumbers={true}
							theme={dracula}
						/>
					</Styles.Debug>
				</Form>
			</Styles.Container>
		);
	};

	const InvoiceForm = withFormik({
		mapPropsToValues: () =>
			({
				invoiceNo: "",
				clientId: "",
				supportItemId: "",
				billTo: "",
				activities: [],
			} as FormValues),
		handleSubmit: (values, { setSubmitting }) => {
			axios.post("/api/invoices", values).then(() => {
				toast.success("Invoice Created");
			});

			setSubmitting(false);
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
