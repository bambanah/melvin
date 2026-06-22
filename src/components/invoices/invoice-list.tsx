import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import ListPage from "@/components/shared/list-page";
import { Button } from "@/components/ui/button";
import DataTable, { SortingHeader } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import Tooltip from "@/components/ui/tooltip";
import { InvoiceStatus } from "@/generated/browser";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { trpc } from "@/lib/trpc";
import { InvoiceListOutput } from "@/server/api/routers/invoice-router";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
	Copy,
	Download,
	MoreHorizontal,
	Pencil,
	Search,
	X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { InvoiceStatusBadge } from "../ui/badge";
import {
	filterFromUrl,
	getStatusLabel,
	getStatusStatuses,
	selectableStatusFilters,
	StatusFilter,
	urlFromFilter
} from "./invoice-list.constants";
import LogPaymentDialog from "./log-payment-dialog";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from "../ui/input-group";
dayjs.extend(require("dayjs/plugin/utc"));

interface Props {
	clientId?: string;
	groupByAssignedStatus?: boolean;
}

function useInvoiceFilters() {
	const router = useRouter();
	const q = router.query;

	const status = filterFromUrl(
		typeof q.status === "string" ? q.status : undefined
	);
	const clientId = typeof q.client === "string" ? q.client : "";
	const search = typeof q.q === "string" ? q.q : "";

	const updateUrl = useCallback(
		(patch: {
			status?: StatusFilter;
			client?: string | null;
			search?: string;
		}) => {
			const query: Record<string, string> = {};

			const newStatus = patch.status ?? status;
			const newClient = patch.client ?? clientId;
			const newSearch = patch.search ?? search;

			const urlStatus = urlFromFilter(newStatus);
			if (urlStatus) query.status = urlStatus;
			if (newClient) query.client = newClient;
			if (newSearch) query.q = newSearch;

			router.replace({ pathname: router.pathname, query }, undefined, {
				shallow: true
			});
		},
		[router, status, clientId, search]
	);

	const reset = useCallback(() => {
		router.replace({ pathname: router.pathname, query: {} }, undefined, {
			shallow: true
		});
	}, [router]);

	return { status, clientId, search, updateUrl, reset };
}

function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

export default function InvoiceList({ clientId: propClientId }: Props) {
	const {
		status,
		clientId: urlClientId,
		search: urlSearch,
		updateUrl,
		reset
	} = useInvoiceFilters();

	const [searchInput, setSearchInput] = useState(urlSearch);
	const debouncedSearch = useDebounce(searchInput, 300);
	const isClearing = useRef(false);

	// Sync URL → input (external navigation)
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setSearchInput(urlSearch);
			if (urlSearch === "") {
				isClearing.current = false;
			}
		}, 0);
		return () => clearTimeout(timeoutId);
	}, [urlSearch]);

	// Sync input → URL (user typing, after debounce)
	useEffect(() => {
		if (isClearing.current) return;
		if (debouncedSearch !== urlSearch) {
			updateUrl({ search: debouncedSearch });
		}
	}, [debouncedSearch, urlSearch, updateUrl]);

	const effectiveClientId = propClientId ?? (urlClientId || undefined);

	// Use debounced value for API query (immediate feedback)
	const { data: invoices } = trpc.invoice.list.useQuery({
		clientId: effectiveClientId,
		status: getStatusStatuses(status),
		search: debouncedSearch || undefined
	});

	const { data: clientsData } = trpc.clients.list.useQuery({});
	const clients = clientsData?.clients ?? [];

	const trpcUtils = trpc.useUtils();
	const markInvoiceAsMutation = trpc.invoice.updateStatus.useMutation();

	const markInvoiceAs = (invoiceId: string, invoiceStatus: InvoiceStatus) => {
		if (invoiceId)
			markInvoiceAsMutation
				.mutateAsync({ ids: [invoiceId], status: invoiceStatus })
				.then(() => {
					trpcUtils.invoice.byId.invalidate({ id: invoiceId });
					trpcUtils.invoice.list.invalidate();
				});
	};

	const hasActiveFilters =
		status !== "" || urlClientId !== "" || urlSearch !== "";

	const clearFilters = () => {
		isClearing.current = true;
		setSearchInput("");
		reset();
	};

	const columns: ColumnDef<InvoiceListOutput>[] = [
		{
			id: "date",
			header: ({ column }) => (
				<SortingHeader column={column}>Date</SortingHeader>
			),
			cell: ({ row }) => <>{dayjs.utc(row.original.date).format("DD/MM/YY")}</>
		},
		{
			accessorKey: "invoiceNo",
			header: ({ column }) => (
				<SortingHeader column={column}>Invoice #</SortingHeader>
			),
			cell: ({ row }) => (
				<Link href={`/dashboard/invoices/${row.original.id}`}>
					{row.getValue("invoiceNo")}
				</Link>
			)
		},
		{
			id: "client-name",
			accessorFn: (invoice) => invoice.client.name,
			header: ({ column }) => (
				<SortingHeader column={column}>Client</SortingHeader>
			),
			cell: ({ row }) => (
				<Link href={`/dashboard/clients/${row.original.client.id}`}>
					{row.original.client.name}
				</Link>
			)
		},
		{
			id: "total-cost",
			accessorFn: (invoice) => {
				const totalCost = getTotalCostOfActivities(invoice.activities);

				return totalCost > 0
					? totalCost.toLocaleString(undefined, {
							style: "currency",
							currency: "AUD"
						})
					: "N/A";
			},
			header: ({ column }) => (
				<SortingHeader column={column}>Total</SortingHeader>
			)
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<SortingHeader column={column}>Status</SortingHeader>
			),
			cell: ({ row }) => (
				<DropdownMenu>
					<DropdownMenuTrigger>
						<InvoiceStatusBadge
							invoiceStatus={row.original.status}
							className="cursor-pointer"
						/>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						{[InvoiceStatus.CREATED, InvoiceStatus.SENT, InvoiceStatus.PAID]
							.filter((status) => status !== row.original.status)
							.map((status) => (
								<DropdownMenuItem
									key={status}
									onClick={() => markInvoiceAs(row.original.id, status)}
									className="cursor-pointer"
								>
									<InvoiceStatusBadge invoiceStatus={status} />
								</DropdownMenuItem>
							))}
					</DropdownMenuContent>
				</DropdownMenu>
			)
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const invoice = row.original;

				return (
					<div className="flex items-center">
						<Tooltip title="Download PDF">
							<a
								href={`/api/invoices/generate-pdf/${invoice.id}`}
								target="_blank"
								download
							>
								<Button variant="ghost" size="icon">
									<Download className="h-4 w-4" />
								</Button>
							</a>
						</Tooltip>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" data-testid="more-actions">
									<MoreHorizontal />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<Link href={`/dashboard/invoices/${invoice.id}/edit`}>
									<DropdownMenuItem className="cursor-pointer">
										<Pencil className="mr-2 h-4 w-4" />
										<span>Edit</span>
									</DropdownMenuItem>
								</Link>
								{invoice.client.invoiceEmail && (
									<DropdownMenuItem
										className="cursor-pointer"
										onClick={() => {
											if (invoice.client.invoiceEmail)
												navigator.clipboard.writeText(
													invoice.client.invoiceEmail
												);
										}}
									>
										<Copy className="mr-2 h-4 w-4" />
										<span>Copy Email</span>
									</DropdownMenuItem>
								)}

								<DeleteEntityButton
									entityId={invoice.id}
									entityType={"invoice"}
								/>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			}
		}
	];

	return (
		<ListPage>
			<ListPage.Header
				title="Invoices"
				createNewHref="/dashboard/invoices/create"
				extraButtons={<LogPaymentDialog />}
			/>

			<div className="flex flex-col gap-3 sm:flex-row">
				<InputGroup className="w-fit">
					<InputGroupAddon>
						<Search className="size-4" />
					</InputGroupAddon>
					<InputGroupInput
						placeholder="Search invoices..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="w-64"
					/>
				</InputGroup>

				<div className="flex w-full flex-wrap items-center gap-2">
					<Select
						value={status}
						onValueChange={(value) =>
							updateUrl({ status: value as StatusFilter })
						}
					>
						<SelectTrigger className="w-full sm:w-36">
							<SelectValue placeholder="Paid Status" />
						</SelectTrigger>
						<SelectContent>
							{selectableStatusFilters.map((filter) => (
								<SelectItem key={filter} value={filter}>
									{getStatusLabel(filter)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{!propClientId && (
						<Select
							value={urlClientId}
							onValueChange={(value) => updateUrl({ client: value || null })}
						>
							<SelectTrigger className="w-full sm:w-36">
								<SelectValue placeholder="Client" />
							</SelectTrigger>
							<SelectContent>
								{clients.map((client) => (
									<SelectItem key={client.id} value={client.id}>
										{client.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					<Button
						variant="ghost"
						size="sm"
						disabled={!hasActiveFilters}
						onClick={clearFilters}
						className="ml-auto"
					>
						<X className="size-4" />
						Clear filters
					</Button>
				</div>
			</div>

			{invoices && <DataTable columns={columns} data={invoices.invoices} />}
		</ListPage>
	);
}
