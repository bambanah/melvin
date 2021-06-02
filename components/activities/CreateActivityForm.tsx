import { FormikProps, getIn, withFormik } from "formik";
import React from "react";
import styled from "styled-components";
import Activity from "../../models/Activity";
import { Activity as ActivityType } from "../../shared/types";
import ActivityValidationSchema from "../../schema/ActivityValidationSchema";
import { errorIn } from "../../shared/utils/helpers";
import Button from "../../shared/components/Button";
import ButtonGroup from "../../shared/components/ButtonGroup";
import Form from "../../shared/components/forms/Form";
import Input from "../../shared/components/forms/Input";
import Label from "../../shared/components/forms/Label";
import Select from "../../shared/components/forms/Select";
import Subheading from "../../shared/components/text/Subheading";
import { createActivity, updateActivity } from "../../shared/utils/firebase";

interface Props {
	setCreating: (creating: boolean) => void;
	activityToLoad?: ActivityType;
	activityId?: string;
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

const CreateActivityForm = ({
	setCreating,
	activityToLoad,
	activityId,
}: Props) => {
	const BaseActivityForm = ({
		values,
		touched,
		errors,
		handleChange,
		handleBlur,
		handleSubmit,
	}: FormikProps<ActivityType>) => (
		<Form onSubmit={handleSubmit} flexDirection="column">
			<InputGroup>
				<Heading>General</Heading>
				<Label htmlFor="description" required>
					<span>Description</span>
					<Subheading>
						The official description from the{" "}
						<a href="/price-guide-3-21.pdf">Price Guide</a>.
					</Subheading>
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
					<Subheading>This will almost always be per hour.</Subheading>
					<Select
						name="rate_type"
						error={errorIn(errors, touched, "rate_type")}
					>
						<option value="" disabled>
							Select...
						</option>
						<option value="hr">per hour</option>
						<option value="km">per km</option>
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
					<ActivityRow key={day}>
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
							value={getIn(values, `${day}.item_code`)}
							placeholder="Code"
							error={errorIn(errors, touched, `${day}.item_code`)}
						/>
						<span style={{ marginRight: "-0.8rem" }}>$</span>
						<Input
							type="text"
							onChange={handleChange}
							onBlur={handleBlur}
							name={`${day}.rate`}
							id={`${day}.rate`}
							value={getIn(values, `${day}.rate`)}
							placeholder="Rate"
							error={errorIn(errors, touched, `${day}.rate`)}
						/>
					</ActivityRow>
				))}
			</ActivityRates>

			<ButtonGroup>
				<Button type="submit" primary>
					{activityToLoad ? "Update" : "Create"}
				</Button>
				<Button type="button" onClick={() => setCreating(false)}>
					Cancel
				</Button>
			</ButtonGroup>
		</Form>
	);

	const FormikForm = withFormik({
		mapPropsToValues: () => {
			if (activityToLoad) {
				return activityToLoad;
			}

			return new Activity() as ActivityType;
		},
		handleSubmit: (values, { setSubmitting }) => {
			if (activityToLoad && activityId) {
				updateActivity(activityId, values);
			} else {
				createActivity(values);
			}

			setSubmitting(false);
			setCreating(false);
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
