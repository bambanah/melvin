import { InvoiceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Heading from "@/components/ui/heading";
import Loading from "@/components/ui/loading";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { trpc } from "@/lib/trpc";
import {
	faClock,
	faPaperPlane,
	faUser,
} from "@fortawesome/free-regular-svg-icons";
import {
	faDollarSign,
	faDownload,
	faMagnifyingGlassPlus,
	faRunning,
	faUndo,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dialog, Transition } from "@headlessui/react";
import { InvoiceStatus } from "@prisma/client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment, useState } from "react";
import { toast } from "react-toastify";

import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const PdfPreview = dynamic(() => import("@/components/invoices/pdf-preview"));
const ConfirmDialog = dynamic(() => import("@/components/ui/confirm-dialog"));
const ActivityList = dynamic(
	() => import("@/components/activities/activity-list")
);

const InvoicePage = ({ invoiceId }: { invoiceId: string }) => {
	const router = useRouter();

	const [isPdfPreviewExpanded, setIsPdfPreviewExpanded] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const trpcUtils = trpc.useUtils();
	const { data: invoice, error } = trpc.invoice.byId.useQuery({
		id: invoiceId,
	});
	const markInvoiceAsMutation = trpc.invoice.updateStatus.useMutation();
	const deleteInvoiceMutation = trpc.invoice.delete.useMutation();

	const deleteInvoice = () => {
		if (invoiceId)
			deleteInvoiceMutation
				.mutateAsync({ id: invoiceId })
				.then(() => {
					trpcUtils.invoice.list.invalidate();

					toast.success("Invoice deleted");
					router.push("/dashboard/invoices");
				})
				.catch(() => {
					toast.error("An error occured. Please refresh and try again.");
				});
	};

	const markInvoiceAs = (invoiceStatus: InvoiceStatus) => {
		if (invoiceId)
			markInvoiceAsMutation
				.mutateAsync({ ids: [invoiceId], status: invoiceStatus })
				.then(() => {
					trpcUtils.invoice.byId.invalidate({ id: invoiceId });
					trpcUtils.invoice.list.invalidate();
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
						<Dialog.Panel className="box-border h-full w-full max-w-4xl">
							<PdfPreview invoiceId={invoice.id} className="my-10" />
						</Dialog.Panel>
					</div>
				</Dialog>
			</Transition>
			<ConfirmDialog
				title="Are you sure you want to delete this invoice?"
				description="Note: This cannot be undone."
				isOpen={isDeleteDialogOpen}
				setIsOpen={setIsDeleteDialogOpen}
				confirmText="Delete"
				cancelText="Cancel"
				confirmAction={deleteInvoice}
			/>

			<div className="flex flex-col items-stretch justify-between md:h-[15rem] md:flex-row-reverse">
				<div
					className={cn([
						"group relative h-full max-h-[12rem] min-h-[12rem] basis-1/2 overflow-hidden md:h-[15rem]",
						invoice.activities.length > 0 &&
							"cursor-pointer bg-zinc-200 shadow-inner",
					])}
				>
					{invoice.activities.length > 0 ? (
						<>
							<div className="mx-auto w-8/12 basis-1/2">
								<PdfPreview invoiceId={invoice.id} />
							</div>
							<div
								className="absolute right-0 top-0 flex h-full w-full items-center justify-center"
								onClick={() => setIsPdfPreviewExpanded(true)}
							>
								<div className="flex items-center justify-center gap-2 rounded-full bg-zinc-900 bg-opacity-90 px-4 py-3 text-zinc-50 transition-transform group-hover:scale-110 md:px-3 md:py-2 md:text-lg">
									<FontAwesomeIcon icon={faMagnifyingGlassPlus} />
									Preview
								</div>
							</div>
						</>
					) : (
						<div className="flex h-[12rem] w-full items-center justify-center bg-zinc-200 md:h-[15rem]">
							<p className="text-4xl text-zinc-400">DRAFT</p>
						</div>
					)}
				</div>
				<div className="mx-auto flex w-full basis-1/2 flex-col px-4 py-4 md:pt-0">
					<div className="flex items-center justify-between md:mb-5">
						<Heading className="py-3">{invoice.invoiceNo}</Heading>
						<Link
							href={`/dashboard/invoices/${invoice.id}/edit`}
							className="px-4 py-3 text-sm"
						>
							EDIT
						</Link>
					</div>
					<p className="text-sm text-zinc-700">Total</p>
					<div className="flex items-center justify-between">
						<p className="text-xl">
							{getTotalCostOfActivities(invoice.activities).toLocaleString(
								undefined,
								{ style: "currency", currency: "AUD" }
							)}
						</p>
						<InvoiceStatusBadge invoiceStatus={invoice.status} />
					</div>

					<div className="flex flex-grow flex-col justify-start gap-4">
						<div className="mt-5 flex justify-center gap-2">
							{invoice.status === InvoiceStatus.CREATED &&
								invoice.activities.length > 0 && (
									<Button
										onClick={() => {
											markInvoiceAs(InvoiceStatus.SENT);
										}}
										className="w-1/2 grow"
									>
										<FontAwesomeIcon icon={faPaperPlane} /> Mark as Sent
									</Button>
								)}
							{invoice.status === InvoiceStatus.SENT && (
								<Button
									onClick={() => markInvoiceAs(InvoiceStatus.PAID)}
									variant="secondary"
									className="w-1/2 grow"
								>
									<FontAwesomeIcon icon={faDollarSign} /> Mark as Paid
								</Button>
							)}
							{invoice.status === InvoiceStatus.PAID && (
								<Button
									onClick={() => {
										markInvoiceAs("CREATED");
									}}
									className="w-1/2 grow"
								>
									<FontAwesomeIcon icon={faUndo} />
									Revert to Created
								</Button>
							)}
							<Button asChild className="w-1/2 grow">
								<a href={`/api/invoices/generate-pdf/${invoiceId}`}>
									<FontAwesomeIcon icon={faDownload} />
									Download PDF
								</a>
							</Button>
						</div>
						{invoice.sentAt && (
							<div className="flex flex-col gap-1 text-zinc-600">
								<p>Sent on: {dayjs.utc(invoice.sentAt).format("DD/MM/YYYY")}</p>
							</div>
						)}
					</div>
				</div>
			</div>
			<div className="flex w-full flex-col justify-between md:flex-row md:pt-6">
				<div className="flex basis-1/2 flex-col gap-0 p-2 px-4">
					<p className="font-semibold">Info</p>
					<div className="flex items-center gap-4 p-2">
						<FontAwesomeIcon icon={faClock} className="text-fg w-4" />
						<p>{dayjs.utc(invoice.date).format("DD/MM/YYYY")}</p>
					</div>
					<Link
						className="text-fg flex w-full items-center gap-4 p-2 text-left hover:bg-zinc-200"
						href={`/dashboard/clients/${invoice.client.id}`}
					>
						<FontAwesomeIcon icon={faUser} className="text-fg w-4" />
						{invoice.client.name}
					</Link>
					<div className="flex items-center gap-4 p-2">
						<FontAwesomeIcon icon={faRunning} className="text-fg w-4" />
						<p>
							{invoice.activities.length} Activit
							{invoice.activities.length > 1 ? "ies" : "y"}
						</p>
					</div>
					{invoice.paidAt && (
						<div className="flex items-center gap-4 p-2">
							<FontAwesomeIcon icon={faDollarSign} className="text-fg w-4" />
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
