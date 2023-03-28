import { InvoiceStatusBadge } from "@atoms/badge";
import ConfirmDialog from "@atoms/confirm-dialog";
import Dropdown from "@atoms/dropdown";
import Heading from "@atoms/heading";
import Loading from "@atoms/loading";
import ActivityList from "@components/activities/activity-list";
import {
	faClock,
	faEllipsisV,
	faMagnifyingGlassPlus,
	faRunning,
	faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dialog, Transition } from "@headlessui/react";
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

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoice) return <Loading />;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
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

			<div className="flex flex-col justify-between gap-8 md:flex-row-reverse">
				<div
					className="group relative h-full max-h-[20rem] w-full cursor-pointer overflow-hidden shadow-lg md:max-h-[15rem]"
					onClick={() => setIsPdfPreviewExpanded(true)}
				>
					<PdfPreview invoiceId={invoice.id} />
					<div className="absolute top-0 right-0 flex h-full w-full items-center justify-center">
						<div className="flex items-center justify-center gap-2 rounded-full bg-gray-900 bg-opacity-90 p-3 text-gray-50 transition-transform group-hover:scale-110 md:py-2 md:px-3 md:text-lg">
							<FontAwesomeIcon icon={faMagnifyingGlassPlus} />
							Preview
						</div>
					</div>
				</div>
				<div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Heading>{invoice.invoiceNo}</Heading>
							<InvoiceStatusBadge invoiceStatus={invoice.status} />
						</div>
						<Dropdown>
							<Dropdown.Button>
								<FontAwesomeIcon icon={faEllipsisV} />
							</Dropdown.Button>
							<Dropdown.Items>
								<Dropdown.Item>
									<Link
										href={`/invoices/${invoice.id}/edit`}
										className="px-3 py-4 text-neutral-900 hover:bg-neutral-100 sm:py-2"
									>
										Edit
									</Link>
								</Dropdown.Item>
								<Dropdown.Item>
									<button
										type="button"
										className="px-3 py-4 text-left text-neutral-900 hover:bg-neutral-100 sm:py-2"
										onClick={() => setIsDeleteDialogOpen(true)}
									>
										Delete
									</button>
								</Dropdown.Item>
							</Dropdown.Items>
						</Dropdown>
					</div>

					<div className="flex flex-grow flex-col justify-center gap-3">
						<div className="flex items-center gap-2">
							<FontAwesomeIcon icon={faClock} />
							<p>{dayjs.utc(invoice.date).format("DD/MM/YYYY")}</p>
						</div>
						<Link
							className="flex items-center gap-2 text-lg"
							href={`/clients/${invoice.client.id}`}
						>
							<FontAwesomeIcon icon={faUser} className="text-fg" />
							{invoice.client.name}
						</Link>
						<div className="flex items-center gap-2">
							<FontAwesomeIcon icon={faRunning} />
							<p className="text-lg">{invoice.activities.length} (69 hours)</p>
						</div>
					</div>
				</div>
			</div>

			<div className="hidden md:block">
				<ActivityList groupByAssignedStatus={false} invoiceId={invoice.id} />
			</div>
		</div>
	);
};

export default InvoicePage;
