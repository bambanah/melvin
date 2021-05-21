import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import styled from "styled-components";
import Input from "../../shared/components/forms/Input";
import { Activity as ActivityType } from "../../shared/types";
import { deleteActivity } from "../../shared/utils/firebase";

interface Props {
	activity: ActivityType;
}

const Row = styled.tr`
	td {
		padding: 0.8rem 0;
	}
`;

const ActionContainer = styled.div`
	display: flex;
	gap: 0.5rem;
`;

const Action = styled(FontAwesomeIcon)`
	cursor: pointer;

	&:hover {
		color: #777;
	}
`;

const LocalInput = styled(Input)``;

const Activity = ({ activity }: Props) => {
	const [editing, setEditing] = useState(false);
	const [activityState, setActivityState] = useState<ActivityType | null>(null);

	const saveActivity = () => {
		setEditing(false);
	};

	function deleteThisActivity() {
		if (confirm("Are you sure you want to delete?")) {
			deleteActivity(activity.description);
		}
	}

	function startEditing() {
		setActivityState(activity);
		setEditing(true);
	}

	function stopEditing() {
		setActivityState(null);
		setEditing(false);
	}

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		console.log(e.target.id);
		let newActivity = activityState;
		console.log(newActivity);
		if (newActivity) {
			newActivity[e.target.id] = e.target.value;

			setActivityState(newActivity);
		}
	}

	return (
		<Row>
			<td>
				{editing ? (
					<LocalInput id="description" value={activityState?.description} />
				) : (
					<span>${activity.description}</span>
				)}
			</td>
			<td>
				{editing ? (
					<LocalInput id="weekday.rate" value={activityState?.weekday.rate} />
				) : (
					<span>
						<strong>${activity.weekday.rate}</strong>/{activity.rate_type}
					</span>
				)}
			</td>
			<td>
				{editing ? (
					<LocalInput
						id="weeknight.rate"
						value={activityState?.weeknight.rate}
					/>
				) : (
					<span>
						<strong>${activity.weeknight.rate}</strong>/{activity.rate_type}
					</span>
				)}
			</td>
			<td>
				{editing ? (
					<LocalInput
						id="saturday.rate"
						value={activityState?.saturday.rate}
						onChange={handleChange}
					/>
				) : (
					<span>
						<strong>${activity.saturday.rate}</strong>/{activity.rate_type}
					</span>
				)}
			</td>
			<td>
				{editing ? (
					<LocalInput id="sunday.rate" value={activityState?.sunday.rate} />
				) : (
					<span>
						<strong>${activity.sunday.rate}</strong>/{activity.rate_type}
					</span>
				)}
			</td>
			<td>
				<ActionContainer>
					{editing ? (
						<>
							<Action icon="check" onClick={() => saveActivity()} />
							<Action icon="times" onClick={() => stopEditing()} />
						</>
					) : (
						<Action icon="edit" onClick={() => startEditing()} />
					)}
					<Action icon="trash" onClick={() => deleteThisActivity()} />
				</ActionContainer>
			</td>
		</Row>
	);
};

export default Activity;
