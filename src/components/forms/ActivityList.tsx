import { Field, FieldArray, FormikErrors, FormikTouched } from "formik";
import React, { useEffect, useState } from "react";
import { getActivities } from "../../services/firebase";
import { ActivityObject, Invoice } from "../../types";
import TimePicker from "./TimePicker";

interface PropInterface {
	values: Invoice;
	touched: FormikTouched<Invoice>;
	errors: FormikErrors<Invoice>;
	getIn: Function;
	setFieldValue: Function;
}

export default function ActivityList({
	values,
	touched,
	errors,
	getIn,
	setFieldValue,
}: PropInterface) {
	const [activities, setActivities] = useState({} as ActivityObject);

	useEffect(() => {
		getActivities().then((activityObject: ActivityObject) => {
			setActivities(activityObject);
		});
	}, []);

	return (
		<FieldArray
			name="activities"
			render={(arrayHelpers) => (
				<>
					{values.activities && (
						<>
							<label className="label">Activities</label>
							{values.activities.map((_, index) => (
								<React.Fragment key={index}>
									<div className="field is-grouped">
										<div className="control is-expanded">
											<div
												className={`select ${
													getIn(touched, `activities.${index}.activity_ref`) &&
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

										<TimePicker
											formValue={`activities.${index}.start_time`}
											setFieldValue={setFieldValue}
										/>

										<TimePicker
											formValue={`activities.${index}.end_time`}
											setFieldValue={setFieldValue}
										/>
									</div>
								</React.Fragment>
							))}

							<button
								className="button"
								type="button"
								onClick={() => {
									const newActivity = {
										activity_ref: "",
										start_time: "",
										end_time: "",
									};

									arrayHelpers.insert(values.activities.length, newActivity);
								}}
							>
								+
							</button>
						</>
					)}
				</>
			)}
		/>
	);
}
