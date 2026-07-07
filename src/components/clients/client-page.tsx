import CustomRatesTable from "@/components/clients/custom-rates-table";
import SupportItemOverrideDialog from "@/components/clients/support-item-override-dialog";
import InvoiceList from "@/components/invoices/invoice-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Heading from "@/components/ui/heading";
import Loading from "@/components/ui/loading";
import { trpc } from "@/lib/trpc";
import {
	Archive,
	ArchiveRestore,
	EllipsisVertical,
	ExternalLink,
	Pencil,
	Trash
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

const ClientPage = ({ clientId }: { clientId: string }) => {
	const router = useRouter();

	const trpcUtils = trpc.useUtils();
	const { data: client, error } = trpc.clients.byId.useQuery({
		id: clientId ?? ""
	});

	const deleteClientMutation = trpc.clients.delete.useMutation();
	const updateClientMutation = trpc.clients.update.useMutation();

	const deleteClient = () => {
		if (confirm("Are you sure?"))
			deleteClientMutation
				.mutateAsync({ id: clientId })
				.then(() => {
					trpcUtils.clients.list.invalidate();
					toast.success("Client deleted");
					router.push("/dashboard/clients");
				})
				.catch((error) => {
					toast.error(
						error instanceof Error
							? error.message
							: "An error occured. Please refresh and try again."
					);
				});
	};

	const toggleActive = () => {
		if (!client) return;

		updateClientMutation
			.mutateAsync({
				id: client.id,
				client: {
					name: client.name,
					number: client.number ?? undefined,
					billTo: client.billTo ?? undefined,
					invoiceNumberPrefix: client.invoiceNumberPrefix ?? undefined,
					distanceToClient: client.distanceToClient?.toString(),
					travelTimeToClient: client.travelTimeToClient?.toString(),
					transitRatePerKm: client.transitRatePerKm?.toString(),
					invoiceEmail: client.invoiceEmail ?? undefined,
					active: !client.active
				}
			})
			.then(() => {
				trpcUtils.clients.byId.invalidate({ id: clientId });
				trpcUtils.clients.list.invalidate();
				toast.success(
					client.active ? "Client deactivated" : "Client reactivated"
				);
			});
	};

	if (error) {
		console.error(error);
		return <div>Error</div>;
	}
	if (!client) return <Loading />;

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col items-start justify-center p-4">
			<div className="my-2 flex w-full flex-col gap-2 px-4 sm:my-8">
				<div className="mb-2 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Heading>{client.name}</Heading>
						{!client.active && <Badge variant="secondary">Inactive</Badge>}
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild className="grow-0">
							<Button variant="ghost" size="icon">
								<EllipsisVertical />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<Link href={`/dashboard/clients/${client.id}/edit`}>
								<DropdownMenuItem className="cursor-pointer">
									<Pencil className="mr-2 h-4 w-4" />
									<span>Edit</span>
								</DropdownMenuItem>
							</Link>

							<DropdownMenuItem
								onClick={() => toggleActive()}
								className="cursor-pointer"
							>
								{client.active ? (
									<>
										<Archive className="mr-2 h-4 w-4" />
										<span>Deactivate</span>
									</>
								) : (
									<>
										<ArchiveRestore className="mr-2 h-4 w-4" />
										<span>Reactivate</span>
									</>
								)}
							</DropdownMenuItem>

							<DropdownMenuItem
								onClick={() => deleteClient()}
								className="cursor-pointer"
							>
								<Trash className="mr-2 h-4 w-4" />
								<span>Delete</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="flex flex-col">
					<h3 className="font-semibold">Participant Number</h3>
					{client.number ? (
						<p>{client.number}</p>
					) : (
						<p className="text-foreground/50">Not set</p>
					)}
				</div>

				<div className="flex flex-col">
					<h3 className="font-semibold">Bill To</h3>
					{client.billTo ? (
						<p>{client.billTo}</p>
					) : (
						<p className="text-foreground/50">Not set</p>
					)}
				</div>

				<div className="flex flex-col">
					<h3 className="font-semibold">Invoice Prefix</h3>
					{client.invoiceNumberPrefix ? (
						<p>
							{client.invoiceNumberPrefix}
							<span className="text-foreground/50">##</span>
						</p>
					) : (
						<p className="text-foreground/50">Not set</p>
					)}
				</div>

				<div className="flex flex-col">
					<h3 className="font-semibold">Distance to Client (one-way)</h3>
					{client.distanceToClient ? (
						<p>{client.distanceToClient.toString()} km</p>
					) : (
						<p className="text-foreground/50">Not set</p>
					)}
				</div>

				<div className="flex flex-col">
					<h3 className="font-semibold">Travel Time to Client (one-way)</h3>
					{client.travelTimeToClient ? (
						<p>{client.travelTimeToClient.toString()} min</p>
					) : (
						<p className="text-foreground/50">Not set</p>
					)}
				</div>

				<div className="flex flex-col">
					<h3 className="font-semibold">Transit Rate</h3>
					{client.transitRatePerKm ? (
						<p>${client.transitRatePerKm.toString()}/km</p>
					) : (
						<p className="text-foreground/50">Using default</p>
					)}
				</div>

				<div className="flex flex-col">
					<h3 className="font-semibold">Invoice Email</h3>
					{client.invoiceEmail ? (
						<a
							className="flex items-center gap-2 underline"
							href={`mailto:${client.invoiceEmail}`}
						>
							{client.invoiceEmail}
							<ExternalLink className="h-4 w-4" />
						</a>
					) : (
						<p className="text-foreground/50">Not set</p>
					)}
				</div>
				<div className="space-y-2">
					<h3 className="font-semibold">Custom Rates</h3>
					<CustomRatesTable clientId={client.id} />
					<SupportItemOverrideDialog clientId={client.id} />
				</div>
			</div>

			<InvoiceList clientId={client.id} groupByAssignedStatus={false} />
		</div>
	);
};

export default ClientPage;
