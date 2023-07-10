import Button from "@atoms/button";
import InfiniteList from "@components/shared/infinite-list";
import ListPage from "@components/shared/list-page";
import {
	faPeopleGroup,
	faPlus,
	faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Prisma, RateType } from "@prisma/client";
import { trpc } from "@utils/trpc";
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
					<span className="font-semibold text-neutral-400">{"// "}</span>
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

				<Button as={Link} href="/support-items/create" variant="primary">
					<FontAwesomeIcon icon={faPlus} />
					<span>Add</span>
				</Button>
			</ListPage.Header>
			<InfiniteList queryResult={queryResult} dataKey="supportItems">
				{(supportItems) =>
					supportItems.map((supportItem) => (
						<div key={supportItem.id} className="flex flex-col gap-4 p-4">
							<Link href={`/support-items/${supportItem.id}`}>
								<p className="font-semibold sm:text-lg">
									{supportItem.description}{" "}
									{supportItem.isGroup && (
										<FontAwesomeIcon
											icon={faUserGroup}
											size="2xs"
											className="ml-2"
											title="Group Activity"
										/>
									)}
								</p>
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
