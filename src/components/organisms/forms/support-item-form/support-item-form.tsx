import Button from "@atoms/button";
import ErrorMessage from "@atoms/error-message";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Input from "@atoms/input";
import Label from "@atoms/label";
import Select from "@atoms/select/select";
import Subheading from "@atoms/subheading";
import ButtonGroup from "@molecules/button-group";
import { RateType, SupportItem } from "@prisma/client";
import SupportItemValidationSchema from "@schema/support-item-validation-schema";
import { errorIn } from "@utils/helpers";
import { trpc } from "@utils/trpc";
import { FormikProps, getIn, withFormik } from "formik";
import { useRouter } from "next/router";
import React from "react";
import { toast } from "react-toastify";
import * as Styles from "./styles";

interface CreateActivityProps {
	initialValues?: Partial<SupportItem>;
	returnFunction?: () => void;
}

interface FormValues {
	id: string;
	description: string;
	rateType: RateType;

	weekdayCode: string;
	weekdayRate: string;

	weeknightCode: string;
	weeknightRate: string;

	saturdayCode: string;
	saturdayRate: string;

	sundayCode: string;
	sundayRate: string;
}

const CreateSupportItemForm: React.FC<CreateActivityProps> = ({
	initialValues,
	returnFunction,
}) => {
	const router = useRouter();

	const utils = trpc.useContext();
	const createSupportItemMutation = trpc.supportItem.add.useMutation();
	const modifySupportItemMutation = trpc.supportItem.modify.useMutation();

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
							<Label htmlFor="description" required>
								<span>Description</span>
								<Subheading>
									The official description from the{" "}
									<a href="/price-guide-3-21.pdf">Price Guide</a>
								</Subheading>
								<Input
									type="text"
									onChange={handleChange}
									onBlur={handleBlur}
									value={values.description}
									name="description"
									id="description"
									error={errorIn(errors, touched, "description")}
									placeholder="Description"
								/>
								<ErrorMessage
									error={getIn(errors, "description")}
									touched={getIn(touched, "description")}
								/>
							</Label>

							<Label htmlFor="rateType" required>
								<span>Rate Type</span>
								<Subheading>This will almost always be per hour</Subheading>
								<Select
									name="rateType"
									error={errorIn(errors, touched, "rateType")}
									options={[
										{ label: "per hour", value: "HOUR" },
										{ label: "per km", value: "KM" },
									]}
								/>
							</Label>
						</Styles.InputRow>
					</Styles.InputGroup>

					<Styles.InputGroup>
						<Styles.Heading>Rates</Styles.Heading>
						<Subheading>
							Only the weekday information is required, and will be used in the
							event of another rate not being entered
						</Subheading>

						{["weekday", "weeknight", "saturday", "sunday"].map((day) => (
							<Styles.ActivityRow key={day}>
								<Label required={day === "weekday"}>
									<span>
										{day
											.split("_")
											.map(
												(word) => word.charAt(0).toUpperCase() + word.slice(1)
											)
											.join(" ")}
									</span>
								</Label>
								<Styles.InputContainer>
									<Input
										type="text"
										onChange={handleChange}
										onBlur={handleBlur}
										name={`${day}Code`}
										id={`${day}Code`}
										value={getIn(values, `${day}Code`)}
										placeholder="XX_XXX_XXXX_X_X"
										error={errorIn(errors, touched, `${day}Code`)}
									/>
									<ErrorMessage
										error={getIn(errors, `${day}Code`)}
										touched={getIn(touched, `${day}Code`)}
									/>
								</Styles.InputContainer>

								<Styles.InputContainer>
									<Input
										type="text"
										onChange={handleChange}
										onBlur={handleBlur}
										name={`${day}Rate`}
										id={`${day}Rate`}
										value={getIn(values, `${day}Rate`)}
										placeholder=""
										error={errorIn(errors, touched, `${day}Rate`)}
										prefix="$"
										suffix={values.rateType === RateType.HOUR ? "/hr" : "/km"}
									/>
									<ErrorMessage
										error={getIn(errors, `${day}Rate`)}
										touched={getIn(touched, `${day}Rate`)}
									/>
								</Styles.InputContainer>
							</Styles.ActivityRow>
						))}
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
									router.push("/support-items");
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
				description: initialValues?.description ?? "",
				rateType: initialValues?.rateType?.toString() ?? "HOUR",

				weekdayCode: initialValues?.weekdayCode ?? "",
				weekdayRate:
					typeof initialValues?.weekdayRate === "string"
						? Number.parseFloat(initialValues?.weekdayRate).toFixed(2)
						: "",

				weeknightCode: initialValues?.weeknightCode ?? "",
				weeknightRate:
					typeof initialValues?.weeknightRate === "string"
						? Number.parseFloat(initialValues?.weeknightRate).toFixed(2)
						: "",

				saturdayCode: initialValues?.saturdayCode ?? "",
				saturdayRate:
					typeof initialValues?.saturdayRate === "string"
						? Number.parseFloat(initialValues?.saturdayRate).toFixed(2)
						: "",

				sundayCode: initialValues?.sundayCode ?? "",
				sundayRate:
					typeof initialValues?.sundayRate === "string"
						? Number.parseFloat(initialValues?.sundayRate).toFixed(2)
						: "",
			} as FormValues;
		},
		handleSubmit: (values, { setSubmitting }) => {
			if (initialValues?.id) {
				modifySupportItemMutation
					.mutateAsync({
						id: initialValues.id,
						supportItem: values,
					})
					.then(() => {
						toast.success("Support Item Updated");
						setSubmitting(false);

						utils.supportItem.invalidate();

						returnFunction ? returnFunction() : router.push("/support-items");
					});
			} else {
				createSupportItemMutation
					.mutateAsync({
						supportItem: values,
					})
					.then(() => {
						toast.success("Support Item Created");
						setSubmitting(false);

						utils.supportItem.invalidate();

						router.push("/support-items");
					});
			}
		},
		validationSchema: SupportItemValidationSchema,
		validateOnChange: false,
		validateOnMount: false,
		validateOnBlur: true,
		displayName: "SupportItem Form",
	})(BaseForm);

	return <FormikForm />;
};

export default CreateSupportItemForm;
