import Button from "@atoms/Button";
import Form from "@atoms/Form";
import Input from "@atoms/Input/Input";
import Label from "@atoms/Label";
import Select from "@atoms/Select";
import Subheading from "@atoms/Subheading";
import Title from "@atoms/Title";
import { Client, Invoice, SupportItem } from "@prisma/client";
import InvoiceValidationSchema from "@schema/InvoiceValidationSchema";
import { errorIn } from "@utils/helpers";
import axios from "axios";
import { FieldArray, FormikProps, withFormik } from "formik";
import { useRouter } from "next/router";
import React from "react";
import { toast } from "react-toastify";
import * as Styles from "./styles";

interface CreateInvoiceFormProps {
	clients: Client[];
	supportItems: SupportItem[];
}

type FormValues = Partial<Invoice> & {
	activities: {
		itemDistance: string;
		itemDuration: string;
		transitDistance: string;
		transitDuration: string;
	}[];
};

const CreateInvoiceForm = ({
	clients,
	supportItems,
}: CreateInvoiceFormProps) => {
	const router = useRouter();

	const BaseForm = (props: FormikProps<FormValues>) => {
		const { values, touched, errors, handleChange, handleBlur, handleSubmit } =
			props;

		return (
			<Form onSubmit={handleSubmit} flexDirection="column">
				<Title>Create New Invoice</Title>

				<Label htmlFor="clientId" required>
					<span>Client</span>
					<Select
						id="clientId"
						name="clientId"
						error={errorIn(errors, touched, "clientId")}
						onChange={() => {
							if (values.clientId) {
								values.billTo =
									clients.find((c) => c.id === values.clientId)?.billTo ?? "";
							}
						}}
					>
						<option value="" disabled key="select">
							Select...
						</option>
						{clients?.map((client) => (
							<option value={client.id} key={client.id}>
								{client.name}
							</option>
						))}
					</Select>
				</Label>

				<Label htmlFor="invoiceNo" required>
					<span>Invoice Number</span>
					<Subheading>
						Will autofill based on the previous invoice (if one exists)
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
					<Subheading>Will usually be HELP Enterprises</Subheading>
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

				<Select
					name="supportItemId"
					error={errorIn(errors, touched, "supportItemId")}
				>
					<option value="" disabled key="select">
						Select...
					</option>
					{supportItems?.map((supportItem) => (
						<option value={supportItem.id} key={supportItem.id}>
							{supportItem.description}
						</option>
					))}
				</Select>

				<FieldArray
					name="activities"
					render={(arrayHelpers) => (
						<Styles.ActivityContainer>
							{values.activities && values.activities.length > 0 ? (
								<div>
									{values.activities.map((activity, index) => (
										<div key={index}>
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
												/>
											</Label>
										</div>
									))}

									<button type="button" onClick={() => arrayHelpers.push("")}>
										+
									</button>
								</div>
							) : (
								<button type="button" onClick={() => arrayHelpers.push("")}>
									+
								</button>
							)}
						</Styles.ActivityContainer>
					)}
				/>

				<Button type="submit">Create</Button>
				{errors && <span>{JSON.stringify(errors)}</span>}
				{values && <span>{JSON.stringify(values)}</span>}
			</Form>
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
