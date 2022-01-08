/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import styled from "styled-components";
import { RateType, SupportItem } from "@prisma/client";
import { toast } from "react-toastify";
import { shade } from "polished";

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
		color: ${({ theme }) => shade(0.2, theme.colors.fg)};
	}
`;

const Activity = ({ supportItem }: Props) => {
	function deleteThisActivity() {
		toast.success("Deleted Support Item");
	}

	let rateTypeDisplay: { [index: string]: string } = {};
	rateTypeDisplay[RateType.HOUR] = "hr";
	rateTypeDisplay[RateType.KM] = "km";

	const rateType = supportItem.rateType === RateType.HOUR ? "hr" : "km";

	return (
		<Row key={supportItem.id}>
			<td>
				<span>{supportItem.description}</span>
			</td>
			<td>
				<span>
					<strong>${supportItem.weekdayRate}</strong>/{rateType}
				</span>
			</td>
			<td>
				<span>
					<strong>${supportItem.weeknightRate}</strong>/{rateType}
				</span>
			</td>
			<td>
				<span>
					<strong>${supportItem.saturdayRate}</strong>/{rateType}
				</span>
			</td>
			<td>
				<span>
					<strong>${supportItem.sundayRate}</strong>/{rateType}
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
