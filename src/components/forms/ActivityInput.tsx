import { Field } from "formik";
import React from "react";
import { ActivityObject } from "../../types";

const ActivityInput = ({
	ref_value,
	ref_text,
	ref_error,
	ref_touched,
	duration_value,
	duration_text,
	duration_error,
	duration_touched,
	activities,
}: {
	ref_value: string;
	ref_text?: string;
	ref_error?: string;
	ref_touched?: boolean;
	duration_value: string;
	duration_text?: string;
	duration_error?: string;
	duration_touched?: boolean;
	activities: ActivityObject;
}) => {
	return (
		<div className="field is-grouped">
			<div className="control is-expanded">
				<div
					className={`select ${ref_touched && ref_error && "is-danger"}`}
					key={ref_value}
				>
					<Field id={ref_value} as="select" name={ref_value}>
						<option disabled value="">
							{ref_text || "Select activity..."}
						</option>
						{Object.entries(activities).map(([activityId, activity]) => (
							<option value={`activities/${activityId}`}>
								{activity.description}
							</option>
						))}
					</Field>
				</div>
			</div>
			<div className="control is-expanded">
				<Field
					className={`input ${
						duration_touched && duration_error && "is-danger"
					}`}
					id={duration_value}
					name={duration_value}
					placeholder={duration_text || duration_value}
				/>
			</div>
		</div>
	);
};

export default ActivityInput;
