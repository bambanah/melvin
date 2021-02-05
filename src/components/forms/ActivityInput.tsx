import { Field } from "formik";
import React from "react";
import { ActivityObject } from "../../types";

const ActivityInput = ({
	ref_value,
	ref_text,
	ref_error,
	ref_touched,
	time_text,
	start_value,
	start_error,
	start_touched,
	end_value,
	end_error,
	end_touched,
	activities,
}: {
	ref_value: string;
	ref_text?: string;
	ref_error?: string;
	ref_touched?: boolean;
	time_text?: string;
	start_value: string;
	start_error?: string;
	start_touched?: boolean;
	end_value: string;
	end_error?: string;
	end_touched?: boolean;
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
		</div>
	);
};

export default ActivityInput;
