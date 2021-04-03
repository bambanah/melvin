import { Field, FieldArray, FormikErrors, FormikTouched } from "formik";
import React, { ChangeEvent, useEffect, useState } from "react";
import { getActivities } from "../../shared/utils/firebase";
import { ActivityObject, Invoice } from "../../types";
import TimePicker from "./TimePicker";

interface PropInterface {
	values: Invoice;
	touched: FormikTouched<Invoice>;
	errors: FormikErrors<Invoice>;
	getIn: Function;
	setFieldValue: Function;
	handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export default function ActivityList({
	values,
	touched,
	errors,
	getIn,
	setFieldValue,
	handleChange,
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
								<label className="label">Activities</label>
								{values.activities.map((activity_value, index) => (
									<React.Fragment key={index}>
										<div className="field is-grouped">
											<Field
												className="input"
												id={`activities.${index}.date`}
												name={`activities.${index}.date`}
												placeholder={"DD-MM-YYYY"}
											/>
											<div className="control">
												<div
													className={`select ${
														getIn(
															touched,
															`activities.${index}.activity_ref`
														) &&
														getIn(errors, `activities.${index}.activity_ref`) &&
														"is-danger"
													}`}
													key={`activities.${index}.activity_ref`}
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
											</div>

											{activity_value.activity_ref.length > 0 && (
												<>
													{activities[activity_value.activity_ref.split("/")[1]]
														.rate_type === "hr" && (
														<>
															<TimePicker
																formValue={`activities.${index}.start_time`}
																setFieldValue={setFieldValue}
															/>

															<TimePicker
																formValue={`activities.${index}.end_time`}
																setFieldValue={setFieldValue}
															/>
														</>
													)}

													{activities[activity_value.activity_ref.split("/")[1]]
														.rate_type === "km" && (
														<div className="field">
															<div className="control has-icons-right">
																<input
																	className="input"
																	value={values.activities[index].distance}
																	name={`activities.${index}.distance`}
																	onChange={handleChange}
																/>
																<span className="icon is-small is-right">
																	km
																</span>
															</div>
														</div>
													)}

													<span>
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
															].rate_type}
													</span>
												</>
											)}
										</div>
									</React.Fragment>
								))}

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
	} else {
		return <div>Loading Activities...</div>;
	}
}
