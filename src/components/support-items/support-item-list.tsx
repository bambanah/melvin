import InfiniteList from "@/components/shared/infinite-list";
import ListPage from "@/components/shared/list-page";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Prisma, RateType } from "@prisma/client";
import { Plus, Users } from "lucide-react";
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
					{Number(rate).toLocaleString(undefined, {
						style: "currency",
						currency: "AUD",
					})}
					/{rateType === "KM" ? "km" : "hr"}
				</>
			)}
		</div>
	);
};

function SupportItemList() {
	const queryResult = trpc.supportItem.list.useInfiniteQuery({});

	return (
		<ListPage>
			<ListPage.Header>
				<h2 className="mr-auto text-2xl font-bold">Support Items</h2>

				<Button asChild variant="inverted">
					<Link href="/dashboard/support-items/create">
						<Plus className="mr-2 h-4 w-4" />
						Add
					</Link>
				</Button>
			</ListPage.Header>
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
