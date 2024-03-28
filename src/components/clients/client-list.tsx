import InfiniteList from "@/components/shared/infinite-list";
import ListPage from "@/components/shared/list-page";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import dayjs from "dayjs";
import { Building, Clock, FileText, Plus, SquarePen, User } from "lucide-react";
import Link from "next/link";

const ClientList = () => {
	const queryResult = trpc.clients.list.useInfiniteQuery(
		{},
		{ getNextPageParam: (lastPage) => lastPage.nextCursor }
	);

	return (
		<ListPage>
			<ListPage.Header>
				<h2 className="mr-auto text-2xl font-bold">Clients</h2>

				<Button asChild variant="inverted">
					<Link href="/dashboard/clients/create">
						<Plus className="mr-2 h-4 w-4" />
						Add
					</Link>
				</Button>
			</ListPage.Header>
			<InfiniteList queryResult={queryResult} dataKey="clients">
				{(clients) =>
					clients.map((client) => (
						<div
							key={client.id}
							className="flex w-full justify-between gap-2 p-4 text-sm text-foreground"
						>
							<div className="flex min-h-[2.5rem] flex-col gap-2">
								<Link href={`/dashboard/clients/${client.id}`}>
									<h3 className="font-semibold sm:text-lg">{client.name}</h3>
								</Link>
								{client.invoices.length > 0 && (
									<>
										<span className="flex items-center gap-2">
											<FileText className="h-4 w-4" />
											{client.invoices.length}
										</span>
										<div className="flex items-center gap-2">
											<Clock className="h-4 w-4" />
											<span>
												{dayjs(client.invoices[0].date).format("DD/MM")} -
											</span>
											{client.invoices[0].invoiceNo}
										</div>
									</>
								)}
							</div>
							<div className="flex flex-col items-end gap-2 pt-[0.5rem]">
								<span className="flex items-center gap-2">
									{client.number}
									<User className="h-4 w-4" />
								</span>
								{client.billTo && (
									<span className="flex items-center gap-2">
										{client.billTo}
										<Building className="h-4 w-4" />
									</span>
								)}
								{client.invoiceNumberPrefix && (
									<span className="flex items-center gap-2">
										{client.invoiceNumberPrefix}##
										<SquarePen className="h-4 w-4" />
									</span>
								)}
							</div>
						</div>
					))
				}
			</InfiniteList>
		</ListPage>
	);
};

export default ClientList;
