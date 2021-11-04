/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import styled from "styled-components";
import { SupportItem } from "@prisma/client";
import { toast } from "react-toastify";

interface Props {
	supportItem: SupportItem;
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
		toast.success("Deleted Support Item");
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
					<Action icon="edit" onClick={() => {}} />
					<Action icon="trash" onClick={() => deleteThisActivity()} />
				</ActionContainer>
			</td>
		</Row>
	);
};

export default Activity;
