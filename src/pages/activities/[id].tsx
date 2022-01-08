import Layout from "@layouts/common/Layout";
import { RateType, SupportItem } from "@prisma/client";
import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import React, { FC } from "react";
import safeJsonStringify from "safe-json-stringify";

interface ActivityProps {
	supportItem: SupportItem;
}

const Activity: FC<ActivityProps> = ({ supportItem }) => {
	const rateType = supportItem.rateType === RateType.HOUR ? "hr" : "km";

	return (
		<Layout>
			<Head>
				<title>{supportItem.description} - Melvin</title>
			</Head>
			<div>
				<Link href="/activities">&lt; Back to activities</Link>
				<h1>{supportItem.description}</h1>
				<p>
					Weekday Rate: ${supportItem.weekdayRate}/{rateType}
				</p>
			</div>
		</Layout>
	);
};

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
	const supportItem = await prisma.supportItem.findUnique({
		where: {
			id: String(params?.id) || undefined,
		},
	});

	return {
		props: {
			supportItem: JSON.parse(
				safeJsonStringify(supportItem ?? {})
			) as SupportItem,
		},
	};
};

export default Activity;
