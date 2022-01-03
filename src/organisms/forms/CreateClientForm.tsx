import Button from "@atoms/Button";
import Form from "@atoms/Form";
import Input from "@atoms/Input";
import Label from "@atoms/Label";
import { Client } from "@prisma/client";
import ClientValidationSchema from "@schema/ClientValidationSchema";
import { errorIn } from "@utils/helpers";
import axios from "axios";
import { FormikProps, withFormik } from "formik";
import { useRouter } from "next/router";
import React from "react";
import { toast } from "react-toastify";

const CreateClientForm = () => {
	const router = useRouter();

	const BaseForm = (props: FormikProps<Partial<Client>>) => {
		const { values, touched, errors, handleChange, handleBlur, handleSubmit } =
			props;

		return (
			<Form onSubmit={handleSubmit} flexDirection="column">
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
					/>
				</Label>
				<Button type="submit">Create</Button>
			</Form>
		);
	};

	const FormikForm = withFormik({
		mapPropsToValues: () =>
			({
				name: "",
				number: "",
			} as unknown as Partial<Client>),
		handleSubmit: (values, { setSubmitting }) => {
			axios.post("/api/clients", values).then(() => {
				toast.success("Client Created");
			});

			setSubmitting(false);
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

export default CreateClientForm;
