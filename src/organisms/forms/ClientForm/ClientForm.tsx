import Button from "@atoms/Button";
import ErrorMessage from "@atoms/ErrorMessage";
import Form from "@atoms/Form";
import Input from "@atoms/Input/Input";
import Label from "@atoms/Label";
import Subheading from "@atoms/Subheading";
import Title from "@atoms/Title";
import { Client } from "@prisma/client";
import ClientValidationSchema from "@schema/ClientValidationSchema";
import { errorIn } from "@utils/helpers";
import axios from "axios";
import { FormikProps, getIn, withFormik } from "formik";
import { useRouter } from "next/router";
import React from "react";
import { toast } from "react-toastify";
import { mutate } from "swr";
import * as Styles from "./styles";

const ClientForm = () => {
	const router = useRouter();

	const BaseForm = (props: FormikProps<Partial<Client>>) => {
		const { values, touched, errors, handleChange, handleBlur, handleSubmit } =
			props;

		return (
			<Styles.ClientContainer>
				<Form onSubmit={handleSubmit} flexDirection="column">
					<Title>Add New Client</Title>
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
							value={values.billTo!}
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
							value={values.invoicePrefix!}
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

					<Button type="submit" primary>
						Create
					</Button>
				</Form>
			</Styles.ClientContainer>
		);
	};

	const FormikForm = withFormik({
		mapPropsToValues: () =>
			({
				name: "",
				number: "",
				billTo: "",
				invoicePrefix: "",
			} as unknown as Partial<Client>),
		handleSubmit: (values, { setSubmitting }) => {
			axios.post("/api/clients", values).then(() => {
				toast.success("Client Created");
			});

			setSubmitting(false);
			mutate("/api/clients");
			router.push("/clients");
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
