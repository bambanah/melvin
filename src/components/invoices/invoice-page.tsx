import { useRateContext } from "@/components/shared/use-rate-context";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Heading from "@/components/ui/heading";
import Loading from "@/components/ui/loading";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { downloadOrSharePdf } from "@/lib/download-pdf";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Dialog, DialogPanel, Transition } from "@headlessui/react";
import { InvoiceStatus } from "@/generated/browser";
import dayjs from "dayjs";
import {
	ChevronDown,
	Clock,
	DollarSign,
	Download,
	Dumbbell,
	Plane,
	Search,
	Undo,
	User
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Fragment, useState } from "react";

dayjs.extend(require("dayjs/plugin/utc"));

const PdfPreview = dynamic(() => import("@/components/invoices/pdf-preview"), {
	ssr: false
});
const ActivityList = dynamic(
	() => import("@/components/activities/activity-list")
);

const InvoicePage = ({ invoiceId }: { invoiceId: string }) => {
	const [isPdfPreviewExpanded, setIsPdfPreviewExpanded] = useState(false);
	const rateContext = useRateContext();

	const trpcUtils = trpc.useUtils();
	const { data: invoice, error } = trpc.invoice.byId.useQuery({
		id: invoiceId
	});
	const sendMutation = trpc.invoice.send.useMutation();
	const amendMutation = trpc.invoice.amend.useMutation();
	const markPaidMutation = trpc.invoice.markPaid.useMutation();

	const invalidateInvoice = () => {
		trpcUtils.invoice.byId.invalidate({ id: invoiceId });
		trpcUtils.invoice.list.invalidate();
	};

	const sendInvoice = () => {
		sendMutation.mutateAsync({ ids: [invoiceId] }).then(invalidateInvoice);
	};

	const markInvoiceAsPaid = () => {
		markPaidMutation.mutateAsync({ ids: [invoiceId] }).then(invalidateInvoice);
	};

	const amendInvoice = () => {
		if (!confirm("Amend this invoice? It will go back to draft.")) return;

		amendMutation.mutateAsync({ id: invoiceId }).then(invalidateInvoice);
	};

	// docs/plans/017 Step 7: draft downloads carry a DRAFT watermark; a sent
	// invoice's download is the frozen version the server resolves.
	const downloadInvoicePdf = async (versionNumber?: number) => {
		const dataUrl = await trpcUtils.pdf.forInvoice.fetch({
			invoiceId,
			returnBase64: true,
			versionNumber
		});

		const displayNo = versionNumber
			? (invoice?.versions?.find((v) => v.versionNumber === versionNumber)
					?.displayInvoiceNo ?? invoice?.invoiceNo)
			: invoice?.invoiceNo;

		await downloadOrSharePdf(dataUrl, `${displayNo}.pdf`);
	};

	const sendAndDownloadInvoice = () => {
		sendMutation.mutateAsync({ ids: [invoiceId] }).then(() => {
			invalidateInvoice();
			downloadInvoicePdf();
		});
	};

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoice) return <Loading />;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col">
			<Transition
				show={isPdfPreviewExpanded}
				as={Fragment}
				enter="ease-out duration-300"
				enterFrom="opacity-0"
				enterTo="opacity-100"
				leave="ease-in duration-200"
				leaveFrom="opacity-100"
				leaveTo="opacity-0"
			>
				<Dialog
					onClose={() => setIsPdfPreviewExpanded(false)}
					className="relative z-50"
				>
					<div
						className="fixed inset-0 bg-black/30"
						aria-hidden="true"
						onClick={() => setIsPdfPreviewExpanded(false)}
					/>
					<div className="fixed inset-0 box-border flex w-screen justify-center overflow-y-auto">
						<DialogPanel className="box-border h-full w-full max-w-4xl">
							<PdfPreview invoiceId={invoice.id} className="my-10" />
						</DialogPanel>
					</div>
				</Dialog>
			</Transition>

			<div className="flex flex-col items-stretch justify-between md:h-[15rem] md:flex-row-reverse">
				<div
					className={cn([
						"group relative h-full max-h-[12rem] min-h-[12rem] basis-1/2 overflow-hidden md:max-h-[15rem]",
						invoice.activities.length > 0 &&
							"bg-foreground/10 cursor-pointer shadow-inner"
					])}
				>
					{invoice.activities.length > 0 ? (
						<>
							<div className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden">
								<div className="w-full">
									<PdfPreview invoiceId={invoice.id} />
								</div>
							</div>
							<div
								className="absolute top-0 right-0 flex h-full w-full items-center justify-center"
								onClick={() => setIsPdfPreviewExpanded(true)}
								data-testid="pdf-preview-trigger"
							>
								<div className="flex items-center justify-center gap-2 rounded-md bg-zinc-900/80 px-4 py-3 text-zinc-50 transition-transform group-hover:scale-110 group-hover:bg-zinc-900 md:px-3 md:py-2 md:text-lg">
									<Search className="h-4 w-4" />
									Preview
								</div>
							</div>
						</>
					) : (
						<div className="bg-foreground/10 flex h-full w-full items-center justify-center md:h-[15rem]">
							<p className="text-foreground/50 text-4xl">DRAFT</p>
						</div>
					)}
				</div>
				<div className="mx-auto flex w-full basis-1/2 flex-col px-4 py-4 md:pt-0">
					<div className="flex items-center justify-between md:mb-5">
						<Heading className="py-3">
							{invoice.versions?.[0]?.displayInvoiceNo ?? invoice.invoiceNo}
						</Heading>
						{invoice.status === InvoiceStatus.CREATED && (
							<Link
								href={`/dashboard/invoices/${invoice.id}/edit`}
								className="px-4 py-3 text-sm"
							>
								EDIT
							</Link>
						)}
					</div>
					<p className="text-foreground/80 text-sm">Total</p>
					<div className="flex items-center justify-between">
						<p className="text-xl" data-testid="invoice-total">
							{(invoice.status === InvoiceStatus.CREATED
								? getTotalCostOfActivities(invoice.activities, rateContext)
								: (invoice.versions?.[0]?.total ?? 0)
							).toLocaleString(undefined, {
								style: "currency",
								currency: "AUD"
							})}
						</p>
						<InvoiceStatusBadge invoiceStatus={invoice.status} />
					</div>

					<div className="flex grow flex-col justify-start gap-4">
						<div className="mt-5 flex justify-center gap-2">
							{invoice.status === InvoiceStatus.CREATED &&
								invoice.activities.length > 0 && (
									<Button onClick={sendInvoice} className="w-1/2 grow">
										<Plane className="mr-2 h-4 w-4" /> Mark as Sent
									</Button>
								)}
							{invoice.status === InvoiceStatus.SENT && (
								<Button
									onClick={markInvoiceAsPaid}
									variant="secondary"
									className="w-1/2 grow"
								>
									<DollarSign className="mr-2 h-4 w-4" /> Mark as Paid
								</Button>
							)}
							{(invoice.status === InvoiceStatus.SENT ||
								invoice.status === InvoiceStatus.PAID) && (
								<Button
									onClick={amendInvoice}
									className="w-1/2 grow"
									variant="secondary"
								>
									<Undo className="mr-2 h-4 w-4" />
									Amend
								</Button>
							)}
							{invoice.status === InvoiceStatus.CREATED &&
							invoice.activities.length > 0 ? (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="secondary" className="w-1/2 grow">
											<Download className="mr-2 h-4 w-4" />
											Download
											<ChevronDown className="ml-2 h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem
											className="cursor-pointer"
											onClick={() => downloadInvoicePdf()}
										>
											Download draft
										</DropdownMenuItem>
										<DropdownMenuItem
											className="cursor-pointer"
											onClick={sendAndDownloadInvoice}
										>
											Send & download
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							) : (
								<Button
									className="w-1/2 grow"
									onClick={() => downloadInvoicePdf()}
								>
									<Download className="mr-2 h-4 w-4" />
									Download PDF
								</Button>
							)}
						</div>
						{invoice.sentAt && (
							<div className="text-foreground/80 flex flex-col gap-1">
								<p>Sent on: {dayjs.utc(invoice.sentAt).format("DD/MM/YYYY")}</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{invoice.versions && invoice.versions.length > 0 && (
				<div className="flex w-full flex-col gap-2 p-2 px-4">
					<p className="font-semibold">Version history</p>
					{invoice.versions.map((version) => (
						<div
							key={version.versionNumber}
							className="flex items-center justify-between rounded-md border p-3"
						>
							<div>
								<p className="font-semibold">{version.displayInvoiceNo}</p>
								<p className="text-foreground/60 text-sm">
									Sent {dayjs.utc(version.sentAt).format("DD/MM/YYYY")}
									{version.paidAt &&
										` · Paid ${dayjs.utc(version.paidAt).format("DD/MM/YYYY")}`}
									{version.backfilled && " · Backfilled"}
								</p>
							</div>
							<div className="flex items-center gap-3">
								<p className="font-semibold">
									{version.total.toLocaleString(undefined, {
										style: "currency",
										currency: "AUD"
									})}
								</p>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => downloadInvoicePdf(version.versionNumber)}
								>
									<Download className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
			<div className="flex w-full flex-col justify-between md:flex-row md:pt-6">
				<div className="flex basis-1/2 flex-col gap-0 p-2 px-4">
					<p className="font-semibold">Info</p>
					<div className="flex items-center gap-4 p-2">
						<Clock className="h-4 w-4" />
						<p>{dayjs.utc(invoice.date).format("DD/MM/YYYY")}</p>
					</div>
					<Link
						className="text-fg hover:bg-foreground/15 flex w-full items-center gap-4 rounded-md p-2 text-left"
						href={`/dashboard/clients/${invoice.client.id}`}
					>
						<User className="h-4 w-4" />
						{invoice.client.name}
					</Link>
					<div className="flex items-center gap-4 p-2">
						<Dumbbell className="h-4 w-4" />
						<p>
							{invoice.activities.length} Activit
							{invoice.activities.length > 1 ? "ies" : "y"}
						</p>
					</div>
					{invoice.paidAt && (
						<div className="flex items-center gap-4 p-2">
							<DollarSign className="h-4 w-4" />
							<p>Paid {dayjs.utc(invoice.paidAt).format("DD/MM/YYYY")}</p>
						</div>
					)}
				</div>
			</div>

			<div className="hidden md:mt-8 md:block">
				<ActivityList
					groupByAssignedStatus={false}
					invoiceId={invoice.id}
					displayCreateButton={false}
				/>
			</div>
		</div>
	);
};

export default InvoicePage;
