import { PrototypeSwitcher } from "@/components/regular-time-prototype/prototype-switcher";
import { useRegularTime } from "@/components/regular-time-prototype/store";
import {
	VariantDialogAction,
	VariantDialogEyebrow
} from "@/components/regular-time-prototype/variant-dialog";
import { VariantFormFact } from "@/components/regular-time-prototype/variant-form";
import { VariantSection } from "@/components/regular-time-prototype/variant-section";
import { VariantSentence } from "@/components/regular-time-prototype/variant-sentence";
import { VARIANTS } from "@/components/regular-time-prototype/variants";
import CustomRatesTable from "@/components/clients/custom-rates-table";
import SupportItemOverrideDialog from "@/components/clients/support-item-override-dialog";
import InvoiceList from "@/components/invoices/invoice-list";
import {
	DetailHeader,
	DetailPage,
	DetailSection
} from "@/components/shared/detail-page";
import { Fact, FactGrid, FactList } from "@/components/shared/fact";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Loading from "@/components/ui/loading";
import { trpc } from "@/lib/trpc";
import {
	Archive,
	ArchiveRestore,
	Car,
	EllipsisVertical,
	ExternalLink,
	Fingerprint,
	Pencil,
	Route,
	Trash
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

const NotSet = ({ children = "Not set" }: { children?: string }) => (
	<span className="text-foreground/50">{children}</span>
);

const ClientPage = ({ clientId }: { clientId: string }) => {
	const router = useRouter();
	// PROTOTYPE (#502)
	const variant = (router.query.variant as string) ?? "A";
	const regularTime = useRegularTime(clientId);

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
							: "An error occurred. Please refresh and try again."
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
		<DetailPage>
			<Head>
				<title>{`${client.name} | Melvin`}</title>
			</Head>

			<DetailHeader
				eyebrow={
					variant === "C" && <VariantDialogEyebrow clientId={client.id} />
				}
				title={client.name}
				badge={!client.active && <Badge variant="secondary">Inactive</Badge>}
				subline={`Bill to ${client.billTo ?? client.name}`}
				actions={
					<div className="flex items-center gap-1">
						{variant === "C" && (
							<VariantDialogAction
								clientId={client.id}
								clientName={client.name}
								hasDistance={!!client.distanceToClient}
							/>
						)}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" aria-label="Client actions">
									<EllipsisVertical />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<Link
									href={`/dashboard/clients/${client.id}/edit${variant === "B" ? "?variant=B" : ""}`}
								>
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
									className="text-destructive focus:text-destructive cursor-pointer"
								>
									<Trash className="mr-2 h-4 w-4" />
									<span>Delete</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				}
			>
				<FactGrid>
					<Fact icon={Fingerprint} label="Participant number">
						{client.number ?? <NotSet />}
					</Fact>

					<Fact icon={Car} label="Distance">
						{client.distanceToClient ? (
							`${client.distanceToClient.toString()} km one-way`
						) : (
							<NotSet />
						)}
					</Fact>

					{variant === "B" ? (
						<VariantFormFact clientId={client.id} />
					) : (
						<Fact icon={Route} label="Transit rate">
							{client.transitRatePerKm ? (
								`$${client.transitRatePerKm.toString()}/km`
							) : (
								<NotSet>Using default</NotSet>
							)}
						</Fact>
					)}
				</FactGrid>
			</DetailHeader>

			{variant === "D" && (
				<VariantSentence
					clientId={client.id}
					hasDistance={!!client.distanceToClient}
				/>
			)}

			<DetailSection title="Details">
				<FactList>
					<Fact label="Invoice prefix">
						{client.invoiceNumberPrefix ? (
							<>
								{client.invoiceNumberPrefix}
								<span className="text-foreground/50">##</span>
							</>
						) : (
							<NotSet />
						)}
					</Fact>

					<Fact label="Travel time">
						{client.travelTimeToClient ? (
							`${client.travelTimeToClient.toString()} min one-way`
						) : (
							<NotSet />
						)}
					</Fact>

					<Fact label="Invoice email">
						{client.invoiceEmail ? (
							<a
								className="decoration-foreground/30 hover:decoration-foreground flex items-center gap-2 underline underline-offset-4 transition-colors"
								href={`mailto:${client.invoiceEmail}`}
							>
								{client.invoiceEmail}
								<ExternalLink className="h-4 w-4 shrink-0" />
							</a>
						) : (
							<NotSet />
						)}
					</Fact>
				</FactList>
			</DetailSection>

			{variant === "A" && (
				<VariantSection
					clientId={client.id}
					hasDistance={!!client.distanceToClient}
				/>
			)}

			<DetailSection
				title="Custom rates"
				caption="Rates that override the support item's own"
			>
				<div className="flex flex-col items-start gap-2 px-5 py-4">
					<CustomRatesTable clientId={client.id} />
					<SupportItemOverrideDialog clientId={client.id} />
				</div>
			</DetailSection>

			<InvoiceList clientId={client.id} />

			<PrototypeSwitcher
				variants={VARIANTS}
				current={variant}
				state={regularTime}
			/>
		</DetailPage>
	);
};

export default ClientPage;
