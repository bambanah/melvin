import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import ListPage from "@/components/shared/list-page";
import { Button } from "@/components/ui/button";
import DataTable, { SortingHeader } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { ClientListOutput } from "@/server/api/routers/client-router";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil } from "lucide-react";
import Link from "next/link";

const columns: ColumnDef<ClientListOutput>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => <SortingHeader column={column}>Name</SortingHeader>,
		cell: ({ row }) => (
			<Link href={`/dashboard/clients/${row.original.id}`}>
				{row.getValue("name")}
			</Link>
		),
	},
	{
		accessorKey: "number",
		header: ({ column }) => (
			<SortingHeader column={column}>Number</SortingHeader>
		),
	},
	{
		accessorKey: "invoiceNumberPrefix",
		header: ({ column }) => (
			<SortingHeader column={column}>Invoice Prefix</SortingHeader>
		),
		cell: ({ row }) => <div>{row.getValue("invoiceNumberPrefix")}##</div>,
	},
	{
		id: "invoice-no",
		accessorFn: (client) => client.invoices.length,
		header: ({ column }) => (
			<SortingHeader column={column}># Invoices</SortingHeader>
		),
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const client = row.original;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon">
							<MoreHorizontal />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<Link href={`/dashboard/clients/${client.id}/edit`}>
							<DropdownMenuItem className="cursor-pointer">
								<Pencil className="mr-2 h-4 w-4" />
								<span>Edit</span>
							</DropdownMenuItem>
						</Link>

						<DeleteEntityButton entityId={client.id} entityType={"clients"} />
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];

const ClientList = () => {
	const { data: clients } = trpc.clients.list.useQuery({});

	return (
		<ListPage>
			<ListPage.Header
				title="Clients"
				createNewHref="/dashboard/clients/create"
			/>

			{clients && <DataTable columns={columns} data={clients.clients} />}
		</ListPage>
	);
};

export default ClientList;
