import { Field, FieldArray, FormikErrors, FormikTouched } from "formik";
import React, { ChangeEvent, useEffect, useState } from "react";
import styled from "styled-components";
import Button from "../../shared/components/Button";
import Text from "../../shared/components/text/Text";
import { getActivities } from "../../shared/utils/firebase";
import { ActivityObject, Invoice } from "../../shared/types";
import TimePicker from "./TimePicker";
import Control from "./Control";

interface PropInterface {
	values: Invoice;
	touched: FormikTouched<Invoice>;
	errors: FormikErrors<Invoice>;
	getIn: Function;
	setFieldValue: Function;
	handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const ActivityListContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	margin-bottom: 1rem;
`;

const ActivityRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.4rem;
`;

const DateField = styled(Field)`
	width: 10rem;
`;

const Inputs = styled.div`
	flex: 0 0 auto;
	align-items: center;
	display: flex;
	gap: 0.4rem;

	@media screen and (max-width: 900px) {
		label {
			display: none;
		}
	}
`;

const TravelDetails = styled.div`
	display: flex;
	flex: 1 0 100%;
	justify-content: center;
	align-items: center;

	input {
		width: 3rem;
		margin-left: 0.8rem;
		/* padding: 0 0.2rem; */
		height: 2rem;
	}

	p:last-of-type {
		margin-left: 1rem;
	}

	span {
		margin-left: 0.2rem;
	}
`;

const ActivitySelect = styled.div`
	flex: 1 1 25%;

	select {
		width: 100%;
	}
`;

export default function ActivityList({
	values,
	touched,
	errors,
	getIn,
	handleChange,
	setFieldValue,
}: PropInterface) {
	const [activities, setActivities] = useState({} as ActivityObject);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		getActivities().then((activityObject: ActivityObject) => {
			setActivities(activityObject);

			setLoaded(true);
		});
	}, []);

	const getActivityDetails = (activity_ref: string) => {
		const activityDetail = activities[activity_ref];

		return activityDetail;
	};

	if (loaded) {
		return (
			<FieldArray
				name="activities"
				render={(arrayHelpers) => (
					<>
						{values.activities && (
							<>
								<Text className="label">Activities</Text>
								<ActivityListContainer>
									{values.activities.map((activity_value, index) => (
										<ActivityRow key={activity_value + index.toString()}>
											<DateField
												className={`input ${
													getIn(touched, `activities.${index}.date`) &&
													getIn(errors, `activities.${index}.date`) &&
													"is-danger"
												}`}
												id={`activities.${index}.date`}
												name={`activities.${index}.date`}
												placeholder="DD-MM-YYYY"
											/>

											<ActivitySelect
												className={`select ${
													getIn(touched, `activities.${index}.activity_ref`) &&
													getIn(errors, `activities.${index}.activity_ref`) &&
													"is-danger"
												}`}
											>
												<Field
													id={`activities.${index}.activity_ref`}
													as="select"
													name={`activities.${index}.activity_ref`}
												>
													<option disabled value="">
														Select activity...
													</option>
													{Object.entries(activities).map(
														([activityId, activity]) => (
															<option
																key={activity.description}
																value={`activities/${activityId}`}
															>
																{activity.description}
															</option>
														)
													)}
												</Field>
											</ActivitySelect>

											{activity_value.activity_ref.length > 0 && (
												<>
													{getActivityDetails(
														activity_value.activity_ref.split("/")[1]
													)?.rate_type === "hr" && (
														<Inputs>
															<label htmlFor={`activities.${index}.start_time`}>
																Start:
															</label>
															<TimePicker
																formValue={`activities.${index}.start_time`}
																setFieldValue={setFieldValue}
															/>

															<label htmlFor={`activities.${index}.end_time`}>
																End:
															</label>
															<TimePicker
																formValue={`activities.${index}.end_time`}
																setFieldValue={setFieldValue}
															/>
														</Inputs>
													)}

													{getActivityDetails(
														activity_value.activity_ref.split("/")[1]
													)?.rate_type === "km" && (
														<Inputs>
															<Control className="control has-icons-right is-expanded">
																<input
																	className="input"
																	value={values.activities[index].distance}
																	name={`activities.${index}.distance`}
																	onChange={handleChange}
																/>
																<span className="icon is-small is-right">
																	km
																</span>
															</Control>
														</Inputs>
													)}
												</>
											)}

											<Button
												className="is-danger is-light"
												onClick={() => {
													arrayHelpers.remove(index);
												}}
											>
												X
											</Button>
											<TravelDetails>
												<p>Distance:</p>
												<Field
													className={`input ${
														getIn(
															touched,
															`activities.${index}.travel_distance`
														) &&
														getIn(
															errors,
															`activities.${index}.travel_distance`
														) &&
														"is-danger"
													}`}
													id={`activities.${index}.travel_distance`}
													name={`activities.${index}.travel_distance`}
												/>
												<span> km</span>
												<p>Duration:</p>
												<Field
													className={`input ${
														getIn(
															touched,
															`activities.${index}.travel_duration`
														) &&
														getIn(
															errors,
															`activities.${index}.travel_duration`
														) &&
														"is-danger"
													}`}
													id={`activities.${index}.travel_duration`}
													name={`activities.${index}.travel_duration`}
												/>
												<span>mins</span>
											</TravelDetails>
										</ActivityRow>
									))}
								</ActivityListContainer>

								<div className="field">
									<p className="control">
										<Button
											type="button"
											onClick={() => {
												const newActivity = {
													activity_ref: "",
													start_time: "",
													end_time: "",
													duration: "",
													distance: "",
													date: "",
													travel_distance: "",
													travel_duration: "",
												};

												arrayHelpers.insert(
													values.activities.length,
													newActivity
												);
											}}
										>
											Add new activity...
										</Button>
									</p>
								</div>
							</>
						)}
					</>
				)}
			/>
		);
	}
	return <div>Loading Activities...</div>;
}
