import { RateType, SupportItem } from "@prisma/client";
import Link from "next/link";
import React from "react";
import styled from "styled-components";

interface Props {
	supportItem: SupportItem;
}

const Row = styled.tr`
	cursor: pointer;

	td {
		padding: 0.8rem 0;
	}
`;

const Activity = ({ supportItem }: Props) => {
	let rateTypeDisplay: { [index: string]: string } = {};
	rateTypeDisplay[RateType.HOUR] = "hr";
	rateTypeDisplay[RateType.KM] = "km";

	const rateType = supportItem.rateType === RateType.HOUR ? "hr" : "km";

	return (
		<Link href={`/activities/${supportItem.id}`}>
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
			</Row>
		</Link>
	);
};

export default Activity;
