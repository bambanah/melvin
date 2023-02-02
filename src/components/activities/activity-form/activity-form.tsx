import Button from "@atoms/button";
import ErrorMessage from "@components/forms/error-message";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Input from "@components/forms/input";
import Label from "@atoms/label";
import ClientSelect from "@components/forms/client-select";
import SupportItemSelect from "@components/forms/support-item-select";
import ButtonGroup from "@atoms/button-group";
import { Activity } from "@prisma/client";
import ActivityValidationSchema from "@schema/activity-validation-schema";
import { errorIn } from "@utils/helpers";
import { trpc } from "@utils/trpc";
import dayjs from "dayjs";
import { FormikProps, getIn, withFormik } from "formik";
import { useRouter } from "next/router";
import React from "react";
import { toast } from "react-toastify";
import * as Styles from "./styles";

interface CreateActivityProps {
	initialValues?: Partial<Activity> & { id: string };
	returnFunction?: () => void;
}

interface FormValues {
	id: string;

	clientId: string;
	supportItemId: string;
	date: string;

	startTime: string;
	endTime: string;
}

const CreateActivityForm: React.FC<CreateActivityProps> = ({
	initialValues,
	returnFunction,
}) => {
	const router = useRouter();

	const createActivityMutation = trpc.activity.add.useMutation();
	const modifyActivityMutation = trpc.activity.modify.useMutation();

	const BaseForm = (props: FormikProps<FormValues>) => {
		const { values, touched, errors, handleChange, handleBlur, handleSubmit } =
			props;

		return (
			<Styles.CreateActivityContainer>
				<Heading>
					{initialValues ? `Updating Activity` : "Create New Activity"}
				</Heading>
				<Form onSubmit={handleSubmit} flexDirection="column">
					<Styles.InputGroup>
						<Styles.Heading>General</Styles.Heading>

						<Styles.InputRow>
							<Label htmlFor="clientId" required>
								<span>Client</span>

								<ClientSelect
									name="clientId"
									error={errorIn(errors, touched, "clientId")}
								/>
							</Label>
							<Label htmlFor="supportItemId" required>
								<span>Support Item</span>

								<SupportItemSelect
									name="supportItemId"
									error={errorIn(errors, touched, "supportItemId")}
								/>
							</Label>
							<Label htmlFor="description" required>
								<span>Date</span>
								<Input
									type="text"
									onChange={handleChange}
									onBlur={handleBlur}
									value={values.date}
									name="date"
									id="date"
									error={errorIn(errors, touched, "date")}
									placeholder="Date"
								/>
								<ErrorMessage
									error={getIn(errors, "date")}
									touched={getIn(touched, "date")}
								/>
							</Label>
						</Styles.InputRow>
					</Styles.InputGroup>

					<Styles.InputGroup>
						<Styles.Heading>Rates</Styles.Heading>

						<Styles.InputRow>
							<Label htmlFor="startTime" required>
								<span>Start Time</span>

								<Input
									type="text"
									onChange={handleChange}
									onBlur={handleBlur}
									value={values.startTime}
									name="startTime"
									id="startTime"
									error={errorIn(errors, touched, "startTime")}
									placeholder="Start Time"
								/>
								<ErrorMessage
									error={getIn(errors, "startTime")}
									touched={getIn(touched, "startTime")}
								/>
							</Label>
							<Label htmlFor="endTime" required>
								<span>End Time</span>
								<Input
									type="text"
									onChange={handleChange}
									onBlur={handleBlur}
									value={values.endTime}
									name="endTime"
									id="endTime"
									error={errorIn(errors, touched, "endTime")}
									placeholder="End Time"
								/>
								<ErrorMessage
									error={getIn(errors, "endTime")}
									touched={getIn(touched, "endTime")}
								/>
							</Label>
						</Styles.InputRow>
					</Styles.InputGroup>

					<ButtonGroup>
						<Button type="submit" variant="primary">
							{initialValues ? "Update" : "Create"}
						</Button>
						<Button
							type="button"
							onClick={() => {
								if (returnFunction) {
									returnFunction();
								} else {
									router.push("/activities");
								}
							}}
						>
							Cancel
						</Button>
					</ButtonGroup>
				</Form>
			</Styles.CreateActivityContainer>
		);
	};

	const FormikForm = withFormik({
		mapPropsToValues: () => {
			return {
				id: initialValues?.id ?? undefined,
				supportItemId: initialValues?.supportItemId ?? "",
				date: initialValues?.date?.toString() ?? new Date().toString(),

				startTime: initialValues?.startTime ?? "",
				endTime: initialValues?.endTime ?? "",
			} as FormValues;
		},
		handleSubmit: (values, { setSubmitting }) => {
			if (initialValues) {
				modifyActivityMutation
					.mutateAsync({
						id: initialValues.id,
						activity: {
							...values,
							date: dayjs(values.date).toDate(),
							startTime: dayjs(values.startTime).toDate(),
							endTime: dayjs(values.endTime).toDate(),
						},
					})
					.then(() => {
						toast.success("Activity Created");
						setSubmitting(false);

						returnFunction ? returnFunction() : router.push("/activities");
					});
			} else {
				createActivityMutation
					.mutateAsync({
						activity: {
							...values,
							date: dayjs(values.date).toDate(),
							startTime: dayjs(values.startTime).toDate(),
							endTime: dayjs(values.endTime).toDate(),
						},
					})
					.then(() => {
						toast.success("Activity Created");
						setSubmitting(false);

						returnFunction ? returnFunction() : router.push("/activities");
					});
			}
		},
		validationSchema: ActivityValidationSchema,
		validateOnChange: false,
		validateOnMount: false,
		validateOnBlur: true,
		displayName: "Activity Form",
	})(BaseForm);

	return <FormikForm />;
};

export default CreateActivityForm;
