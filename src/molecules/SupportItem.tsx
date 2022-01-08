import { RateType, SupportItem } from "@prisma/client";
import Link from "next/link";
import { lighten, shade } from "polished";
import React from "react";
import styled from "styled-components";

interface Props {
	supportItem: SupportItem;
}

const Row = styled.tr`
	cursor: pointer;

	&:hover {
		background-color: ${({ theme }) =>
			theme.type === "light"
				? shade(0.2, theme.colors.bg)
				: lighten(0.2, theme.colors.bg)};
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
					{supportItem.weeknightRate ? (
						<span>
							<strong>${supportItem.weeknightRate}</strong>/{rateType}
						</span>
					) : (
						<span>N/A</span>
					)}
				</td>
				<td>
					{supportItem.saturdayRate ? (
						<span>
							<strong>${supportItem.saturdayRate}</strong>/{rateType}
						</span>
					) : (
						<span>N/A</span>
					)}
				</td>
				<td>
					{supportItem.sundayRate ? (
						<span>
							<strong>${supportItem.sundayRate}</strong>/{rateType}
						</span>
					) : (
						<span>N/A</span>
					)}
				</td>
			</Row>
		</Link>
	);
};

export default Activity;
