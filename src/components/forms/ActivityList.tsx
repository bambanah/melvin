import { Field, FieldArray, FormikErrors, FormikTouched } from "formik";
import React, { ChangeEvent, useEffect, useState } from "react";
import styled from "styled-components";
import Button from "../../shared/components/Button";
import Control from "../../shared/components/form/Control";
import Text from "../../shared/components/Text";
import { getActivities } from "../../shared/utils/firebase";
import { ActivityObject, Invoice } from "../../shared/types";
import TimePicker from "./TimePicker";

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
	gap: 0.5rem;
	margin-bottom: 1rem;
`;

const ActivityRow = styled.div`
	display: flex;
	gap: 0.4rem;

	input {
		&:first-of-type {
			width: 10rem;
		}
	}
`;

const Inputs = styled.div`
	flex: 1 0 auto;
	display: flex;
	gap: 0.4rem;
`;

const HourlyText = styled.span`
	line-height: 40px;
	width: 4rem;
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
											<Field
												className={`input ${
													getIn(touched, `activities.${index}.date`) &&
													getIn(errors, `activities.${index}.date`) &&
													"is-danger"
												}`}
												id={`activities.${index}.date`}
												name={`activities.${index}.date`}
												placeholder="DD-MM-YYYY"
											/>

											<div
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
															<option value={`activities/${activityId}`}>
																{activity.description}
															</option>
														)
													)}
												</Field>
											</div>

											{activity_value.activity_ref.length > 0 && (
												<>
													{activities[activity_value.activity_ref.split("/")[1]]
														.rate_type === "hr" && (
														<Inputs>
															<TimePicker
																formValue={`activities.${index}.start_time`}
																setFieldValue={setFieldValue}
															/>

															<TimePicker
																formValue={`activities.${index}.end_time`}
																setFieldValue={setFieldValue}
															/>
														</Inputs>
													)}

													{activities[activity_value.activity_ref.split("/")[1]]
														.rate_type === "km" && (
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

													{activities[activity_value.activity_ref.split("/")[1]]
														.rate_type === "minutes" && (
														<Control className="control has-icons-right">
															<input
																className="input"
																value={values.activities[index].duration}
																name={`activities.${index}.duration`}
																onChange={handleChange}
															/>
															<span className="icon is-small is-right">
																min
															</span>
														</Control>
													)}

													<HourlyText>
														{/* {(activity_value.duration ||
															activity_value.distance) &&
															`$${(
																activities[
																	activity_value.activity_ref.split("/")[1]
																].rate *
																(activity_value.duration ||
																	parseInt(activity_value.distance, 10))
															).toFixed(2)} @ `} */}
														$
														{
															activities[
																activity_value.activity_ref.split("/")[1]
															].rate
														}
														/
														{activity_value.activity_ref.length > 0 &&
														activities[
															activity_value.activity_ref.split("/")[1]
														].rate_type === "minutes"
															? "hr"
															: activities[
																	activity_value.activity_ref.split("/")[1]
															  ].rate_type}
													</HourlyText>
												</>
											)}

											<Button
												className="button is-danger is-light"
												onClick={() => {
													arrayHelpers.remove(index);
												}}
											>
												X
											</Button>
										</ActivityRow>
									))}
								</ActivityListContainer>

								<div className="field">
									<p className="control">
										<button
											className="button is-outlined is-info"
											type="button"
											onClick={() => {
												const newActivity = {
													activity_ref: "",
													start_time: "",
													end_time: "",
													duration: "",
													distance: "",
													date: "",
												};

												arrayHelpers.insert(
													values.activities.length,
													newActivity
												);
											}}
										>
											Add new activity...
										</button>
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
