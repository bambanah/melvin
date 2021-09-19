/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import styled from "styled-components";
import { ItemData } from ".prisma/client";
// import { Activity as ActivityType } from "../../shared/types";
import { deleteActivity } from "../../shared/utils/firebase";

interface Props {
	activity: ItemData;
	// activityId?: string;
	// setActivityId: (activityId: string | undefined) => void;
	// setActivityToLoad: (activity: ActivityType) => void;
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

const Activity = ({ activity }: Props) => {
	function deleteThisActivity() {
		if (confirm("Are you sure you want to delete?")) {
			deleteActivity(activity.description);
		}
	}

	return (
		<Row key={activity.description}>
			<td>
				<span>{activity.description}</span>
			</td>
			<td>
				<span>
					<strong>${activity.weekdayRate}</strong>/{activity.rateType}
				</span>
			</td>
			<td>
				<span>
					<strong>${activity.weeknightRate}</strong>/{activity.rateType}
				</span>
			</td>
			<td>
				<span>
					<strong>${activity.saturdayRate}</strong>/{activity.rateType}
				</span>
			</td>
			<td>
				<span>
					<strong>${activity.sundayRate}</strong>/{activity.rateType}
				</span>
			</td>
			<td>
				<ActionContainer>
					<Action
						icon="edit"
						onClick={() => {
							// setActivityId(activityId);
							// setActivityToLoad(activity);
							console.log("edit");
						}}
					/>
					<Action icon="trash" onClick={() => deleteThisActivity()} />
				</ActionContainer>
			</td>
		</Row>
	);
};

export default Activity;
