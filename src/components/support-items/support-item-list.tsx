import InfiniteList from "@/components/shared/infinite-list";
import ListPage from "@/components/shared/list-page";
import type { SupportItemListOutput } from "@/server/api/routers/support-item-router";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { Users } from "lucide-react";

/** Day rates beyond the mandatory weekday pair - the detail page has them all. */
const extraRateCount = (supportItem: SupportItemListOutput) =>
	[
		supportItem.weeknightCode,
		supportItem.saturdayCode,
		supportItem.sundayCode
	].filter(Boolean).length;

function SupportItemList() {
	const queryResult = trpc.supportItem.list.useInfiniteQuery(
		{},
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor
		}
	);

	return (
		<ListPage>
			<ListPage.Header
				title="Support Items"
				createNewHref="/dashboard/support-items/create"
			/>

			<InfiniteList queryResult={queryResult} dataKey="supportItems">
				{(supportItems) =>
					supportItems.map((supportItem) => {
						const extraRates = extraRateCount(supportItem);

						return (
							<ListPage.Item
								key={supportItem.id}
								href={`/dashboard/support-items/${supportItem.id}`}
							>
								<div className="flex min-w-0 flex-col gap-1">
									<span className="flex items-center gap-2">
										{supportItem.description}
										{supportItem.isGroup && <Users className="h-4 w-4" />}
									</span>
									<span className="text-foreground/50 font-mono text-xs">
										{supportItem.weekdayCode}
									</span>
								</div>

								<div className="flex shrink-0 flex-col items-end gap-1 tabular-nums">
									<span>
										{formatCurrency(Number(supportItem.weekdayRate))}
										<span className="text-foreground/50">
											/{supportItem.rateType === "KM" ? "km" : "hr"}
										</span>
									</span>
									{extraRates > 0 && (
										<span className="text-foreground/50 text-xs">
											+{extraRates} day {extraRates === 1 ? "rate" : "rates"}
										</span>
									)}
								</div>
							</ListPage.Item>
						);
					})
				}
			</InfiniteList>
		</ListPage>
	);
}

export default SupportItemList;
