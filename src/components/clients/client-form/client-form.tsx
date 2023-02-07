import Button from "@atoms/button";
import ButtonGroup from "@atoms/button-group";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Label from "@atoms/label";
import ErrorMessage from "@components/forms/error-message-formik";
import Input from "@components/forms/input-formik";
import { Client } from "@prisma/client";
import ClientValidationSchema from "@schema/client-validation-schema";
import { ClientByIdOutput } from "@server/routers/client-router";
import { errorIn } from "@utils/helpers";
import { trpc } from "@utils/trpc";
import { FormikProps, getIn, withFormik } from "formik";
import Head from "next/head";
import { useRouter } from "next/router";
import { FC } from "react";
import { toast } from "react-toastify";
import * as Styles from "./styles";

interface Props {
	initialValues?: Partial<ClientByIdOutput>;
	returnFunction?: () => void;
}

const ClientForm: FC<Props> = ({ initialValues, returnFunction }) => {
	const router = useRouter();

	const utils = trpc.useContext();

	const clientUpdateMutation = trpc.clients.update.useMutation();
	const clientCreateMutation = trpc.clients.create.useMutation();

	const BaseForm = (props: FormikProps<Partial<Client>>) => {
		const { values, touched, errors, handleChange, handleBlur, handleSubmit } =
			props;

		return (
			<Styles.ClientContainer>
				<Head>
					<title>
						{initialValues
							? `Updating ${initialValues.name}`
							: "Add New Client"}{" "}
						- Melvin
					</title>
				</Head>
				<Heading>
					{initialValues ? `Updating ${initialValues.name}` : "Add New Client"}
				</Heading>
				<Form onSubmit={handleSubmit} flexDirection="column">
					<Label htmlFor="name" required>
						<span>Participant Name</span>
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
					<Label htmlFor="number">
						<span>Participant Number</span>
						<Input
							type="text"
							onChange={handleChange}
							onBlur={handleBlur}
							value={values.number ?? ""}
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

					<ButtonGroup>
						<Button type="submit" variant="primary">
							{initialValues ? "Update" : "Create"}
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
		mapPropsToValues: () => ({
			id: initialValues?.id ?? undefined,
			name: initialValues?.name ?? "",
			number: initialValues?.number ?? "",
			billTo: initialValues?.billTo ?? "",
		}),
		handleSubmit: (values, { setSubmitting }) => {
			if (initialValues && initialValues.id) {
				clientUpdateMutation.mutateAsync(
					{ id: initialValues.id, client: values },
					{
						onSuccess: () => {
							toast.info("Client Updated");

							utils.clients.list.invalidate();
							returnFunction ? returnFunction() : router.push("/clients");
						},
						onError: (error) => {
							toast.error("An unknown error occured. Refresh and try again.");
							console.error(error.message);
							setSubmitting(false);
						},
					}
				);
			} else {
				clientCreateMutation.mutateAsync(
					{ client: values },
					{
						onSuccess: () => {
							toast.success("Client Created");

							utils.clients.list.invalidate();
							router.push("/clients");
						},
						onError: (error) => {
							toast.error("An unknown error occured. Refresh and try again.");
							console.error(error.message);
							setSubmitting(false);
						},
					}
				);
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
