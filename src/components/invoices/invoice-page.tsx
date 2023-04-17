import { InvoiceStatusBadge } from "@atoms/badge";
import Button from "@atoms/button";
import ConfirmDialog from "@atoms/confirm-dialog";
import Heading from "@atoms/heading";
import Loading from "@atoms/loading";
import ActivityList from "@components/activities/activity-list";
import {
	faClock,
	faCopy,
	faFilePdf,
	faPaperPlane,
	faUser,
} from "@fortawesome/free-regular-svg-icons";
import {
	faMagnifyingGlassPlus,
	faRunning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dialog, Transition } from "@headlessui/react";
import { InvoiceStatus } from "@prisma/client";
import { getTotalCostOfActivities } from "@utils/activity-utils";
import { trpc } from "@utils/trpc";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment, useState } from "react";
import { toast } from "react-toastify";
import PdfPreview from "./pdf-preview";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const InvoicePage = () => {
	const router = useRouter();
	const invoiceId = String(router.query.id);

	const [isPdfPreviewExpanded, setIsPdfPreviewExpanded] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const trpcContext = trpc.useContext();
	const { data: invoice, error } = trpc.invoice.byId.useQuery({
		id: invoiceId,
	});
	const markInvoiceAsMutation = trpc.invoice.updateStatus.useMutation();
	const deleteInvoiceMutation = trpc.invoice.delete.useMutation();

	const deleteInvoice = () => {
		deleteInvoiceMutation
			.mutateAsync({ id: invoiceId })
			.then(() => {
				trpcContext.invoice.list.invalidate();

				toast.success("Invoice deleted");
				router.push("/invoices");
			})
			.catch(() => {
				toast.error("An error occured. Please refresh and try again.");
			});
	};

	const markInvoiceAs = (invoiceStatus: InvoiceStatus) => {
		markInvoiceAsMutation
			.mutateAsync({ id: invoiceId, status: invoiceStatus })
			.then(() => {
				trpcContext.invoice.byId.invalidate({ id: invoiceId });
				trpcContext.invoice.list.invalidate();
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

			<div className="flex flex-col justify-between md:flex-row-reverse">
				<div
					className="group relative h-full max-h-[15rem] basis-1/2 cursor-pointer overflow-hidden bg-gray-200 shadow-inner"
					onClick={() => setIsPdfPreviewExpanded(true)}
				>
					<div className="mx-auto w-8/12 basis-1/2 ">
						<PdfPreview invoiceId={invoice.id} className="shadow-xl" />
					</div>
					<div className="absolute top-0 right-0 flex h-full w-full items-center justify-center">
						<div className="flex items-center justify-center gap-2 rounded-full bg-gray-900 bg-opacity-90 px-4 py-3 text-gray-50 transition-transform group-hover:scale-110 md:py-2 md:px-3 md:text-lg">
							<FontAwesomeIcon icon={faMagnifyingGlassPlus} />
							Preview
						</div>
					</div>
				</div>
				<div className="mx-auto flex w-full basis-1/2 flex-col px-4 py-4 md:pt-0">
					<div className="flex items-center justify-between md:mb-5">
						<Heading className="py-3">{invoice.invoiceNo}</Heading>
						<Link
							href={`/invoices/${invoice.id}/edit`}
							className="px-4 py-3 text-sm"
						>
							EDIT
						</Link>
					</div>
					<p className="text-sm text-gray-700">Total</p>
					<div className="flex items-center justify-between">
						<p className="text-xl">
							{getTotalCostOfActivities(invoice.activities).toLocaleString(
								undefined,
								{ style: "currency", currency: "AUD" }
							)}
						</p>
						<InvoiceStatusBadge invoiceStatus={invoice.status} />
					</div>

					<div className="mt-4 flex flex-grow flex-col justify-center gap-4">
						{invoice.status === InvoiceStatus.SENT ||
							(invoice.status === InvoiceStatus.PAID && (
								<Button
									onClick={() => {
										markInvoiceAs("CREATED");
									}}
								>
									Mark as Created
								</Button>
							))}
						{invoice.status === InvoiceStatus.CREATED && (
							<Button
								onClick={() => {
									markInvoiceAs("SENT");
								}}
								variant="success"
								className="font-semibold"
							>
								Send <FontAwesomeIcon icon={faPaperPlane} />
							</Button>
						)}
					</div>
				</div>
			</div>
			<div className="flex w-full flex-col justify-between md:flex-row-reverse md:pt-6">
				<div className="flex basis-1/2 flex-col gap-0 p-2 px-4">
					<p className="font-semibold">Info</p>
					<div className="flex items-center gap-4 p-2">
						<FontAwesomeIcon icon={faClock} />
						<p>{dayjs.utc(invoice.date).format("DD/MM/YYYY")}</p>
					</div>
					<Link
						className="flex w-full items-center gap-4 p-2 text-left text-fg hover:bg-gray-200"
						href={`/clients/${invoice.client.id}`}
					>
						<FontAwesomeIcon icon={faUser} className="text-fg" />
						{invoice.client.name}
					</Link>
					<div className="flex items-center gap-4 p-2">
						<FontAwesomeIcon icon={faRunning} />
						<p>
							{invoice.activities.length} Activit
							{invoice.activities.length > 1 ? "ies" : "y"}
						</p>
					</div>
				</div>

				<div className="flex basis-1/2 flex-col px-4 pb-4 md:gap-2">
					<p className="font-semibold">Payment</p>
					<Button
						className="mt-2 w-full border p-2 text-center text-blue-700 md:m-0"
						type="button"
						onClick={() => markInvoiceAs(InvoiceStatus.PAID)}
					>
						Mark as Fully Paid
					</Button>
					<p className="pt-4 font-semibold md:p-0">More</p>
					<a
						className="flex w-full items-center gap-4 p-2 text-left text-fg hover:bg-gray-200 md:border md:border-black"
						href={`/invoices/create?copyFrom=${invoiceId}`}
					>
						<FontAwesomeIcon icon={faCopy} />
						Copy
					</a>
					<a
						className="flex w-full items-center gap-4 p-2 text-left text-fg hover:bg-gray-200 md:border md:border-black"
						href={`/api/invoices/generate-pdf/${invoiceId}`}
					>
						<FontAwesomeIcon icon={faFilePdf} />
						Export as PDF
					</a>
				</div>
			</div>

			<div className="hidden md:mt-8 md:block">
				<ActivityList groupByAssignedStatus={false} invoiceId={invoice.id} />
			</div>
		</div>
	);
};

export default InvoicePage;
