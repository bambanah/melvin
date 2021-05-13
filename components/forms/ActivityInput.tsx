import React from "react";
import { Field } from "formik";
import { ActivityObject } from "../../shared/types";

interface Props {
	ref_value: string;
	ref_text?: string;
	ref_error?: string;
	ref_touched?: boolean;
	activities: ActivityObject;
}

const ActivityInput = ({
	ref_value,
	ref_text,
	ref_error,
	ref_touched,
	activities,
}: Props) => (
	<div className="field is-grouped">
		<div className="control">
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

export default ActivityInput;
