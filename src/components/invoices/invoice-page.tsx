import { InvoiceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Heading from "@/components/ui/heading";
import Loading from "@/components/ui/loading";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Dialog, Transition } from "@headlessui/react";
import { InvoiceStatus } from "@prisma/client";
import dayjs from "dayjs";
import {
	Clock,
	DollarSign,
	Download,
	Dumbbell,
	Plane,
	Search,
	Undo,
	User,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Fragment, useState } from "react";

dayjs.extend(require("dayjs/plugin/utc"));

const PdfPreview = dynamic(() => import("@/components/invoices/pdf-preview"));
const ActivityList = dynamic(
	() => import("@/components/activities/activity-list")
);

const InvoicePage = ({ invoiceId }: { invoiceId: string }) => {
	const [isPdfPreviewExpanded, setIsPdfPreviewExpanded] = useState(false);

	const trpcUtils = trpc.useUtils();
	const { data: invoice, error } = trpc.invoice.byId.useQuery({
		id: invoiceId,
	});
	const markInvoiceAsMutation = trpc.invoice.updateStatus.useMutation();

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

			<div className="flex flex-col items-stretch justify-between md:h-[15rem] md:flex-row-reverse">
				<div
					className={cn([
						"group relative h-full max-h-[12rem] min-h-[12rem] basis-1/2 overflow-hidden md:max-h-[15rem]",
						invoice.activities.length > 0 &&
							"cursor-pointer bg-foreground/10 shadow-inner",
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
									<Search className="h-4 w-4" />
									Preview
								</div>
							</div>
						</>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-foreground/10 md:h-[15rem]">
							<p className="text-4xl text-foreground/50">DRAFT</p>
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
					<p className="text-sm text-foreground/80">Total</p>
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
										<Plane className="mr-2 h-4 w-4" /> Mark as Sent
									</Button>
								)}
							{invoice.status === InvoiceStatus.SENT && (
								<Button
									onClick={() => markInvoiceAs(InvoiceStatus.PAID)}
									variant="secondary"
									className="w-1/2 grow"
								>
									<DollarSign className="mr-2 h-4 w-4" /> Mark as Paid
								</Button>
							)}
							{invoice.status === InvoiceStatus.PAID && (
								<Button
									onClick={() => {
										markInvoiceAs("CREATED");
									}}
									className="w-1/2 grow"
									variant="secondary"
								>
									<Undo className="mr-2 h-4 w-4" />
									Revert to Created
								</Button>
							)}
							<Button
								asChild
								className="w-1/2 grow"
								variant={
									invoice.status === InvoiceStatus.CREATED
										? "secondary"
										: "default"
								}
							>
								<a href={`/api/invoices/generate-pdf/${invoiceId}`}>
									<Download className="mr-2 h-4 w-4" />
									Download PDF
								</a>
							</Button>
						</div>
						{invoice.sentAt && (
							<div className="flex flex-col gap-1 text-foreground/80">
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
						<Clock className="h-4 w-4" />
						<p>{dayjs.utc(invoice.date).format("DD/MM/YYYY")}</p>
					</div>
					<Link
						className="text-fg flex w-full items-center gap-4 rounded-md p-2 text-left hover:bg-foreground/15"
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
