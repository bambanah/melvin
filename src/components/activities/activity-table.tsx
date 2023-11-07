import Button from "@atoms/button";
import {
	faArrowRightArrowLeft,
	faSort,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ActivityListOutput } from "@server/api/routers/activity-router";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { getTotalCostOfActivities } from "@utils/activity-utils";
import { formatDuration, getDuration } from "@utils/date-utils";
import dayjs from "dayjs";
import Link from "next/link";
import React from "react";

const columnHelper = createColumnHelper<ActivityListOutput["activities"][0]>();

const getTime = (row: ActivityListOutput["activities"][0]) => {
	if (row.startTime && row.endTime) {
		return formatDuration(getDuration(row.startTime, row.endTime));
	} else {
		return "";
	}
};

const defaultColumns = [
	columnHelper.display({
		id: "checkbox",
		cell: (props) => (
			<span>
				<input type="checkbox" id={props.row.index.toString()} />
			</span>
		),
		header: () => <input type="checkbox" />,
	}),
	columnHelper.accessor("date", {
		cell: (info) => dayjs(info.getValue()).format("DD. MMM YYYY") || "N/A",
		header: () => <span>Date</span>,
	}),
	columnHelper.accessor("invoice.invoiceNo", {
		cell: (info) =>
			info.row.original.invoice ? (
				<Link
					href={`/invoices/${info.row.original.invoice.id}`}
					className="font-medium"
				>
					{info.getValue()}
				</Link>
			) : (
				<>N/A</>
			),
		header: () => <span>Invoice</span>,
	}),
	columnHelper.accessor((row) => getTime(row), {
		id: "time",
		header: () => <span>Time</span>,
	}),
	columnHelper.accessor("client.name", {
		id: "client",
		header: () => <span>Client</span>,
		cell: (info) =>
			info.row.original.client ? (
				<Link
					href={`/clients/${info.row.original.client?.id}`}
					className="font-medium"
				>
					{info.getValue()}
				</Link>
			) : (
				<>N/A</>
			),
	}),
	columnHelper.accessor(
		(row) =>
			getTotalCostOfActivities([row]).toLocaleString(undefined, {
				style: "currency",
				currency: "AUD",
			}),
		{ id: "total", header: () => <span>Total</span> }
	),
	columnHelper.display({
		id: "actions",
		cell: (props) => (
			<span>
				<Button>...</Button>
			</span>
		),
	}),
];

interface ActivityTableProps {
	data: ActivityListOutput["activities"];
}

const ActivityTable: React.FC<ActivityTableProps> = ({ data }) => {
	const table = useReactTable({
		data,
		columns: defaultColumns,
		getCoreRowModel: getCoreRowModel(),
	});
	return (
		<div className="rounded-lg border text-base">
			<table className="w-full">
				<thead className="border-b">
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									className="h-12 cursor-pointer px-4 text-left align-middle font-medium text-zinc-500 [&:has([role=checkbox])]:pr-0"
								>
									<div className="flex items-center gap-2">
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext()
											  )}
										<FontAwesomeIcon icon={faSort} className="text-sm" />
									</div>
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody className="[&_tr:last-child]:border-0">
					{table.getRowModel().rows.map((row) => (
						<tr
							key={row.id}
							className="data-[state=selected]:bg-muted border-b transition-colors hover:bg-zinc-100"
						>
							{row.getVisibleCells().map((cell) => (
								<td
									key={cell.id}
									className="px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0"
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default ActivityTable;
