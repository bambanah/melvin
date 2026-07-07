import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import ListPage from "@/components/shared/list-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import DataTable, { SortingHeader } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { ClientListOutput } from "@/server/api/routers/client-router";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const columns: ColumnDef<ClientListOutput>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => <SortingHeader column={column}>Name</SortingHeader>,
		cell: ({ row }) => (
			<Link
				href={`/dashboard/clients/${row.original.id}`}
				className="flex items-center gap-2"
			>
				{row.getValue("name")}
				{!row.original.active && <Badge variant="secondary">Inactive</Badge>}
			</Link>
		)
	},
	{
		accessorKey: "number",
		header: ({ column }) => (
			<SortingHeader column={column}>Number</SortingHeader>
		)
	},
	{
		accessorKey: "invoiceNumberPrefix",
		header: ({ column }) => (
			<SortingHeader column={column}>Invoice Prefix</SortingHeader>
		),
		cell: ({ row }) => <div>{row.getValue("invoiceNumberPrefix")}##</div>
	},
	{
		id: "invoice-no",
		accessorFn: (client) => client.invoices.length,
		header: ({ column }) => (
			<SortingHeader column={column}># Invoices</SortingHeader>
		)
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
		}
	}
];

const ClientList = () => {
	const [includeInactive, setIncludeInactive] = useState(false);
	const { data: clients } = trpc.clients.list.useQuery({ includeInactive });

	return (
		<ListPage>
			<ListPage.Header
				title="Clients"
				createNewHref="/dashboard/clients/create"
				extraButtons={
					<label className="flex items-center gap-2 text-sm whitespace-nowrap">
						<Checkbox
							checked={includeInactive}
							onCheckedChange={(checked) =>
								setIncludeInactive(checked === true)
							}
						/>
						Show inactive
					</label>
				}
			/>

			{clients && <DataTable columns={columns} data={clients.clients} />}
		</ListPage>
	);
};

export default ClientList;
