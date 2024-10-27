import InfiniteList from "@/components/shared/infinite-list";
import ListPage from "@/components/shared/list-page";
import { trpc } from "@/lib/trpc";
import { decimalToCurrencyString } from "@/lib/utils";
import { Prisma, RateType } from "@prisma/client";
import { Users } from "lucide-react";
import Link from "next/link";

const ItemCode = ({
	descriptor,
	code,
	rate,
	rateType,
}: {
	descriptor: string;
	code: string | null;
	rate: Prisma.Decimal | null;
	rateType?: RateType;
}) => {
	if (!code) return null;
	return (
		<div className="flex flex-nowrap gap-1 whitespace-nowrap">
			<p className="font-semibold">{descriptor}:</p> {code}{" "}
			{rate && (
				<>
					<span className="text-foreground/40">{"// "}</span>
					{decimalToCurrencyString(rate)}/{rateType === "KM" ? "km" : "hr"}
				</>
			)}
		</div>
	);
};

function SupportItemList() {
	const queryResult = trpc.supportItem.list.useInfiniteQuery({});

	return (
		<ListPage>
			<ListPage.Header
				title="Support Items"
				createNewHref="/dashboard/support-items/create"
			/>

			<InfiniteList queryResult={queryResult} dataKey="supportItems">
				{(supportItems) =>
					supportItems.map((supportItem) => (
						<div key={supportItem.id} className="flex flex-col gap-4 p-4">
							<Link
								href={`/dashboard/support-items/${supportItem.id}`}
								className="flex items-center gap-2 sm:text-lg"
							>
								{supportItem.description}
								{supportItem.isGroup && <Users className="h-4 w-4" />}
							</Link>
							<ItemCode
								descriptor="Base"
								code={supportItem.weekdayCode}
								rate={supportItem.weekdayRate}
								rateType={supportItem.rateType}
							/>
							<ItemCode
								descriptor="Weeknight"
								code={supportItem.weeknightCode}
								rate={supportItem.weeknightRate}
								rateType={supportItem.rateType}
							/>
							<ItemCode
								descriptor="Saturday"
								code={supportItem.saturdayCode}
								rate={supportItem.saturdayRate}
								rateType={supportItem.rateType}
							/>
							<ItemCode
								descriptor="Sunday"
								code={supportItem.sundayCode}
								rate={supportItem.sundayRate}
								rateType={supportItem.rateType}
							/>
						</div>
					))
				}
			</InfiniteList>
		</ListPage>
	);
}

export default SupportItemList;
