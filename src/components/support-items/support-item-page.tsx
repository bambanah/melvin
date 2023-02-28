import Loading from "@atoms/loading";
import { RateType } from "@prisma/client";
import { trpc } from "@utils/trpc";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

const SupportItemPage = () => {
	const router = useRouter();

	const { data: supportItem, error } = trpc.supportItem.byId.useQuery({
		id: String(router.query.id),
	});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!supportItem) return <Loading />;

	const rateType = supportItem.rateType === RateType.HOUR ? "hr" : "km";

	return (
		<div className="flex flex-col content-center items-center">
			<Head>
				<title>{supportItem.description} - Melvin</title>
			</Head>
			<div className="flex flex-col content-center items-center px-12">
				<Link href="/support-items">&lt; Back to Support Items</Link>
				<h1>{supportItem.description}</h1>
				<Link href={`/support-items/${supportItem.id}/edit`}>Edit</Link>
				<p>
					Weekday: {supportItem.weekdayCode || "N/A"}{" "}
					{supportItem.weekdayRate
						? `\$${supportItem.weekdayRate}/${rateType}`
						: "N/A"}
				</p>
				<p>
					Weeknight: {supportItem.weeknightCode || "N/A"}{" "}
					{supportItem.weeknightRate
						? `\$${supportItem.weeknightRate}/${rateType}`
						: "N/A"}
				</p>
				<p>
					Saturday: {supportItem.saturdayCode || "N/A"}{" "}
					{supportItem.saturdayRate
						? `$${supportItem.saturdayRate}/${rateType}`
						: "N/A"}
				</p>
				<p>
					Sunday: {supportItem.sundayCode || "N/A"}{" "}
					{supportItem.sundayRate
						? `\$${supportItem.sundayRate}/${rateType}`
						: "N/A"}
				</p>
			</div>
		</div>
	);
};

export default SupportItemPage;
