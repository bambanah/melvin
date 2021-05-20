import { FormikProps, withFormik } from "formik";
import React from "react";
import styled from "styled-components";
import Activity from "../../models/Activity";
import ActivityValidationSchema from "../../shared/schemas/ActivityValidationSchema";
import { errorIn } from "../../shared/utils/helpers";
import Button from "../shared/Button";
import ButtonGroup from "../shared/ButtonGroup";
import Form from "../shared/forms/Form";
import Input from "../shared/forms/Input";
import Label from "../shared/forms/Label";
import Select from "../shared/forms/Select";
import Subheading from "../shared/text/Subheading";

interface Props {
	setCreating: (creating: boolean) => void;
}

const InputGroup = styled.div`
	display: flex;
	gap: 1rem;
	flex-wrap: wrap;
	flex: 1 0 100%;
`;

const ActivityRates = styled.div`
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 1rem;

	h2 {
		flex: 1 0 auto;
	}
`;

const ActivityRow = styled.div`
	display: flex;
	flex: 1 1 auto;
	gap: 1rem;
	align-items: center;

	label {
		flex: 1 1 20%;
	}

	input {
		flex: 1 1 auto;
	}
`;

const Heading = styled.h2`
	flex: 1 1 100%;
	font-size: 1.3rem;
	font-weight: bold;
`;

const CreateActivityForm = ({ setCreating }: Props) => {
	const BaseActivityForm = ({
		values,
		touched,
		errors,
		handleChange,
		handleBlur,
		handleSubmit,
	}: FormikProps<Activity>) => (
		<Form onSubmit={handleSubmit} flexDirection="column">
			<InputGroup>
				<Heading>General</Heading>
				<Label htmlFor="description" required>
					<span>Description</span>
					<Input
						type="text"
						onChange={handleChange}
						onBlur={handleBlur}
						value={values.description}
						name="description"
						id="description"
						error={errorIn(errors, touched, "description")}
					/>
				</Label>

				<Label htmlFor="rate_type" required>
					<span>Rate Type</span>
					<Select
						name="rate_type"
						error={errorIn(errors, touched, "rate_type")}
					>
						<option value="" disabled>
							Select...
						</option>
						<option value="hr">p/hour</option>
						<option value="km">p/km</option>
						<option value="mins">p/minute</option>
					</Select>
				</Label>
			</InputGroup>

			<ActivityRates>
				<Heading>Rates</Heading>
				<Subheading>
					Only the weekday rate is required. The rest will use the weekday rate
					as the default if not provided.
				</Subheading>

				{["weekday", "weeknight", "saturday", "sunday"].map((day) => (
					<ActivityRow>
						<Label required={day === "weekday"}>
							<span>
								{day
									.split("_")
									.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
									.join(" ")}
							</span>
						</Label>
						<Input
							type="text"
							onChange={handleChange}
							onBlur={handleBlur}
							name={`${day}.item_code`}
							id={`${day}.item_code`}
							placeholder="Code"
							error={errorIn(errors, touched, `${day}.item_code`)}
						/>
						<Input
							type="text"
							onChange={handleChange}
							onBlur={handleBlur}
							name={`${day}.rate`}
							id={`${day}.rate`}
							placeholder="Rate"
							error={errorIn(errors, touched, `${day}.rate`)}
						/>
					</ActivityRow>
				))}
			</ActivityRates>

			<ButtonGroup>
				<Button type="submit" primary>
					Create
				</Button>
				<Button type="button" onClick={() => setCreating(false)}>
					Cancel
				</Button>
			</ButtonGroup>
		</Form>
	);

	const FormikForm = withFormik({
		mapPropsToValues: () => new Activity(),
		handleSubmit: (values, { setSubmitting }) => {
			setTimeout(() => {
				// eslint-disable-next-line no-alert
				alert(JSON.stringify(values, null, 2));

				setSubmitting(false);
			}, 1000);
		},
		validationSchema: ActivityValidationSchema,
		validateOnChange: true,
		validateOnMount: false,
		validateOnBlur: true,
		displayName: "Activity Form",
	})(BaseActivityForm);

	return <FormikForm />;
};

export default CreateActivityForm;
