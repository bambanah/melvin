import Loading from "@atoms/loading";
import ListPage from "@components/shared/list-page";
import { trpc } from "@utils/trpc";
import dayjs from "dayjs";

const ClientList = () => {
	const { data: { clients } = {}, error } = trpc.clients.list.useQuery({});

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	return (
		<ListPage title="Clients" createHref="/clients/create">
			<ListPage.Items>
				{clients ? (
					clients.map((client) => (
						<ListPage.Item href={`/clients/${client.id}`} key={client.id}>
							<div className="flex flex-col gap-2">
								<span className="font-semibold sm:text-lg">{client.name}</span>
								<span className="">{client.number}</span>
								{client.invoiceNumberPrefix && (
									<span className="italic text-neutral-600">
										{client.invoiceNumberPrefix}XX
									</span>
								)}
							</div>
							<div className="flex flex-col items-end gap-2">
								<span className="font-semibold">
									Invoices: {client.invoices.length}
								</span>
								{client.invoices.length > 0 && (
									<>
										<div>Most recent: {client.invoices[0].invoiceNo}</div>
										<span className="text-neutral-600">
											{dayjs(client.invoices[0].date).format("DD/MM/YYYY")}
										</span>
									</>
								)}
							</div>
						</ListPage.Item>
					))
				) : (
					<Loading />
				)}
			</ListPage.Items>
		</ListPage>
	);
};

export default ClientList;
