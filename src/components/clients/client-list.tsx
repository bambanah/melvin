import Button from "@/components/atoms/button";
import InfiniteList from "@/components/shared/infinite-list";
import ListPage from "@/components/shared/list-page";
import {
	faBuilding,
	faClock,
	faFileAlt,
	faPenToSquare,
	faPlus,
	faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { trpc } from "@/lib/trpc";
import dayjs from "dayjs";
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

				<Button as={Link} href="/dashboard/clients/create" variant="primary">
					<FontAwesomeIcon icon={faPlus} />
					<span>Add</span>
				</Button>
			</ListPage.Header>
			<InfiniteList queryResult={queryResult} dataKey="clients">
				{(clients) =>
					clients.map((client) => (
						<div
							key={client.id}
							className="flex w-full justify-between gap-2 p-4 text-sm"
						>
							<div className="flex min-h-[2.5rem] flex-col gap-2">
								<Link href={`/dashboard/clients/${client.id}`}>
									<h3 className="font-semibold sm:text-lg">{client.name}</h3>
								</Link>
								{client.invoices.length > 0 && (
									<>
										<span className="flex items-center gap-2 text-zinc-600">
											<FontAwesomeIcon icon={faFileAlt} size="sm" />
											{client.invoices.length}
										</span>
										<div className="flex items-center gap-2 text-zinc-600">
											<FontAwesomeIcon icon={faClock} size="sm" />
											<span>
												{dayjs(client.invoices[0].date).format("DD/MM")} -
											</span>
											{client.invoices[0].invoiceNo}
										</div>
									</>
								)}
							</div>
							<div className="flex flex-col items-end gap-2 pt-[0.5rem] text-zinc-600">
								<span className="flex items-center gap-2">
									{client.number}
									<FontAwesomeIcon icon={faUser} size="sm" />
								</span>
								{client.billTo && (
									<span className="flex items-center gap-2">
										{client.billTo}
										<FontAwesomeIcon icon={faBuilding} size="sm" />
									</span>
								)}
								{client.invoiceNumberPrefix && (
									<span className="flex items-center gap-2">
										{client.invoiceNumberPrefix}##
										<FontAwesomeIcon icon={faPenToSquare} size="sm" />
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
