import { FormikProps, getIn, withFormik } from "formik";
import React from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { RateType, SupportItem } from "@prisma/client";
import ActivityValidationSchema from "@schema/ActivityValidationSchema";
import { errorIn } from "@utils/helpers";
import Button from "@atoms/Button";
import ButtonGroup from "@molecules/ButtonGroup";
import Form from "@atoms/Form";
import Input from "@atoms/Input";
import Label from "@atoms/Label";
import Select from "@atoms/Select";
import Subheading from "@atoms/Subheading";

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

const CreateSupportItemForm = ({ setCreating }: Props) => {
	const BaseSupportItemForm = (props: FormikProps<Partial<SupportItem>>) => {
		const { values, touched, errors, handleChange, handleBlur, handleSubmit } =
			props;

		return (
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

					<Label htmlFor="rateType" required>
						<span>Rate Type</span>
						<Subheading>This will almost always be per hour.</Subheading>
						<Select
							name="rateType"
							error={errorIn(errors, touched, "rateType")}
						>
							<option value="" disabled>
								Select...
							</option>
							<option value="HOUR">per hour</option>
							<option value="KM">per km</option>
						</Select>
					</Label>
				</InputGroup>

				<ActivityRates>
					<Heading>Rates</Heading>
					<Subheading>
						Only the weekday rate is required.The rest will use the weekday rate
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
								name={`${day}Code`}
								id={`${day}Code`}
								value={getIn(values, `${day}Code`)}
								placeholder="Code"
								error={errorIn(errors, touched, `${day}Code`)}
							/>
							<span style={{ marginRight: "-0.8rem" }}>$</span>
							<Input
								type="text"
								onChange={handleChange}
								onBlur={handleBlur}
								name={`${day}Rate`}
								id={`${day}Rate`}
								value={getIn(values, `${day}Rate`)}
								placeholder="Rate"
								error={errorIn(errors, touched, `${day}Rate`)}
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
	};

	const FormikForm = withFormik({
		mapPropsToValues: () =>
			({
			description: "" as string,
			rateType: RateType.HOUR,

			weekdayCode: "",
			weekdayRate: "",
		} as unknown as Partial<SupportItem>),
		handleSubmit: (values, { setSubmitting }) => {
			axios.post("/api/support-items", values).then(() => {
				toast.success("Support Item Created");
			});

			setSubmitting(false);
			setCreating(false);
		},
		validationSchema: ActivityValidationSchema,
		validateOnChange: true,
		validateOnMount: false,
		validateOnBlur: true,
		displayName: "Activity Form",
	})(BaseSupportItemForm);

	return <FormikForm />;
};

export default CreateSupportItemForm;
