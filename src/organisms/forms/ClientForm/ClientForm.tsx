import Button from "@atoms/Button";
import ErrorMessage from "@atoms/ErrorMessage";
import Form from "@atoms/Form";
import Input from "@atoms/Input";
import Label from "@atoms/Label";
import Subheading from "@atoms/Subheading";
import Title from "@atoms/Title";
import ButtonGroup from "@molecules/ButtonGroup";
import { Client } from "@prisma/client";
import ClientValidationSchema from "@schema/ClientValidationSchema";
import { errorIn } from "@utils/helpers";
import axios from "axios";
import { FormikProps, getIn, withFormik } from "formik";
import { useRouter } from "next/router";
import React, { FC } from "react";
import { toast } from "react-toastify";
import { useSWRConfig } from "swr";
import * as Styles from "./styles";

interface Props {
	initialValues?: Partial<Client>;
	returnFunction?: () => void;
}

const ClientForm: FC<Props> = ({ initialValues, returnFunction }) => {
	const router = useRouter();
	const { mutate } = useSWRConfig();

	const BaseForm = (props: FormikProps<Partial<Client>>) => {
		const { values, touched, errors, handleChange, handleBlur, handleSubmit } =
			props;

		return (
			<Styles.ClientContainer>
				<Form onSubmit={handleSubmit} flexDirection="column">
					<Title>
						{initialValues
							? `Updating ${initialValues.name}`
							: "Add New Client"}{" "}
						- Melvin
					</Title>
					<Label htmlFor="name" required>
						<span>Name</span>
						<Input
							type="text"
							onChange={handleChange}
							onBlur={handleBlur}
							value={values.name}
							name="name"
							id="name"
							error={errorIn(errors, touched, "name")}
							placeholder="John Smith"
						/>
						<ErrorMessage
							error={getIn(errors, "name")}
							touched={getIn(touched, "name")}
						/>
					</Label>
					<Label htmlFor="number" required>
						<span>ID Number</span>
						<Input
							type="text"
							onChange={handleChange}
							onBlur={handleBlur}
							value={values.number}
							name="number"
							id="number"
							error={errorIn(errors, touched, "number")}
							placeholder="123456789"
						/>
						<ErrorMessage
							error={getIn(errors, "number")}
							touched={getIn(touched, "number")}
						/>
					</Label>
					<Label htmlFor="billTo">
						<span>Bill To</span>
						<Input
							type="text"
							onChange={handleChange}
							onBlur={handleBlur}
							value={values.billTo ?? ""}
							name="billTo"
							id="billTo"
							error={errorIn(errors, touched, "billTo")}
							placeholder="HELP Enterprises"
						/>
						<ErrorMessage
							error={getIn(errors, "billTo")}
							touched={getIn(touched, "billTo")}
						/>
					</Label>
					<Label htmlFor="invoicePrefix">
						<span>Invoice Prefix</span>
						<Subheading>
							Prefix to use when generating invoice numbers
						</Subheading>
						<Input
							type="text"
							onChange={handleChange}
							onBlur={handleBlur}
							value={values.invoicePrefix ?? ""}
							name="invoicePrefix"
							id="invoicePrefix"
							error={errorIn(errors, touched, "invoicePrefix")}
							placeholder="Smith"
						/>
						<ErrorMessage
							error={getIn(errors, "invoicePrefix")}
							touched={getIn(touched, "invoicePrefix")}
						/>
					</Label>

					<ButtonGroup>
						<Button type="submit" primary>
							{initialValues ? "Save" : "Create"}
						</Button>
						<Button
							type="button"
							onClick={() => {
								returnFunction ? returnFunction() : router.push("/clients");
							}}
						>
							Cancel
						</Button>
					</ButtonGroup>
				</Form>
			</Styles.ClientContainer>
		);
	};

	const FormikForm = withFormik({
		mapPropsToValues: () =>
			({
				id: initialValues?.id ?? "",
				name: initialValues?.name ?? "",
				number: initialValues?.number ?? "",
				billTo: initialValues?.billTo ?? "",
				invoicePrefix: initialValues?.invoicePrefix ?? "",
			} as Partial<Client>),
		handleSubmit: (values, { setSubmitting }) => {
			if (initialValues) {
				axios.post(`/api/clients/${initialValues.id}`, values).then(() => {
					toast.info("Client Updated");
					setSubmitting(false);
					mutate(`/api/clients/${initialValues.id}`);

					returnFunction ? returnFunction() : router.push("/clients");
				});
			} else {
				axios.post("/api/clients", values).then(() => {
					toast.success("Client Created");

					setSubmitting(false);
					mutate("/api/clients");
					router.push("/clients");
				});
			}
		},
		validationSchema: ClientValidationSchema,
		validateOnChange: true,
		validateOnMount: false,
		validateOnBlur: true,
		displayName: "Create Client",
	})(BaseForm);

	return <FormikForm />;
};

export default ClientForm;
