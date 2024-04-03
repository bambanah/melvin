import InvoiceList from "@/components/invoices/invoice-list";
import { Button } from "@/components/ui/button";
import Heading from "@/components/ui/heading";
import Loading from "@/components/ui/loading";
import { trpc } from "@/lib/trpc";
import { EllipsisVertical, ExternalLink, Pencil, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const ClientPage = ({ clientId }: { clientId: string }) => {
	const router = useRouter();

	const trpcUtils = trpc.useUtils();
	const { data: client, error } = trpc.clients.byId.useQuery({
		id: clientId ?? "",
	});
	const deleteClientMutation = trpc.clients.delete.useMutation();

	const deleteClient = () => {
		if (confirm("Are you sure?"))
			deleteClientMutation
				.mutateAsync({ id: clientId })
				.then(() => {
					trpcUtils.clients.list.invalidate();
					toast.success("Client deleted");
					router.push("/dashboard/clients");
				})
				.catch(() => {
					toast.error("An error occured. Please refresh and try again.");
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
					<Heading>{client.name}</Heading>

					<DropdownMenu>
						<DropdownMenuTrigger asChild className="grow-0 ">
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
					<h3 className="font-semibold">Default Transit Distance</h3>
					{client.defaultTransitDistance ? (
						<p>{client.defaultTransitDistance.toString()}</p>
					) : (
						<p className="text-foreground/50">Not set</p>
					)}
				</div>

				<div className="flex flex-col">
					<h3 className="font-semibold">Default Transit Time</h3>
					{client.defaultTransitTime ? (
						<p>{client.defaultTransitTime.toString()}</p>
					) : (
						<p className="text-foreground/50">Not set</p>
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
			</div>

			<InvoiceList clientId={client.id} groupByAssignedStatus={false} />
		</div>
	);
};

export default ClientPage;
