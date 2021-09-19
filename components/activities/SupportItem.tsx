/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import styled from "styled-components";
import { SupportItem } from ".prisma/client";

interface Props {
	supportItem: SupportItem;
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

const Activity = ({ supportItem }: Props) => {
	function deleteThisActivity() {
		console.log("deleted");
	}

	return (
		<Row key={supportItem.description}>
			<td>
				<span>{supportItem.description}</span>
			</td>
			<td>
				<span>
					<strong>${supportItem.weekdayRate}</strong>/{supportItem.rateType}
				</span>
			</td>
			<td>
				<span>
					<strong>${supportItem.weeknightRate}</strong>/{supportItem.rateType}
				</span>
			</td>
			<td>
				<span>
					<strong>${supportItem.saturdayRate}</strong>/{supportItem.rateType}
				</span>
			</td>
			<td>
				<span>
					<strong>${supportItem.sundayRate}</strong>/{supportItem.rateType}
				</span>
			</td>
			<td>
				<ActionContainer>
					<Action
						icon="edit"
						onClick={() => {
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
