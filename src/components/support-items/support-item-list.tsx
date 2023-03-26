import Loading from "@atoms/loading";
import ListPage from "@components/shared/list-page";
import { Prisma } from "@prisma/client";
import { trpc } from "@utils/trpc";

const ItemCode = ({
	descriptor,
	code,
	rate,
}: {
	descriptor: string;
	code: string | null;
	rate: Prisma.Decimal | null;
}) => {
	if (!code) return null;
	return (
		<div className="flex flex-nowrap gap-1 whitespace-nowrap">
			<p className="font-semibold">{descriptor}:</p> {code}{" "}
			{rate && (
				<>
					(
					{Number(rate).toLocaleString(undefined, {
						style: "currency",
						currency: "AUD",
					})}
					/hr)
				</>
			)}
		</div>
	);
};

function SupportItemList() {
	const { data: { supportItems } = {}, error } = trpc.supportItem.list.useQuery(
		{}
	);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	return (
		<ListPage title="Support Items">
			<ListPage.Items>
				{supportItems ? (
					supportItems.map((supportItem) => (
						<ListPage.Item
							key={supportItem.id}
							href={`/support-items/${supportItem.id}`}
						>
							<div className="flex flex-col gap-4">
								<p className="font-semibold sm:text-lg">
									{supportItem.description}
								</p>
								<ItemCode
									descriptor="Base (Weekday)"
									code={supportItem.weekdayCode}
									rate={supportItem.weekdayRate}
								/>
								<ItemCode
									descriptor="Weeknight"
									code={supportItem.weeknightCode}
									rate={supportItem.weeknightRate}
								/>
								<ItemCode
									descriptor="Saturday"
									code={supportItem.saturdayCode}
									rate={supportItem.saturdayRate}
								/>
								<ItemCode
									descriptor="Sunday"
									code={supportItem.sundayCode}
									rate={supportItem.sundayRate}
								/>
							</div>
						</ListPage.Item>
					))
				) : (
					<Loading />
				)}
			</ListPage.Items>
		</ListPage>
	);
}

export default SupportItemList;
