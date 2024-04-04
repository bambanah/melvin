import { ClientListOutput } from "@/server/api/routers/client-router";
import {
	Column,
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./button";
import { DataTablePagination } from "./data-table-pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

const SortingIcon = ({ sorted }: { sorted: false | SortDirection }) => {
	if (sorted === "asc") return <ArrowDown className="ml-2 h-4 w-4" />;

	if (sorted === "desc") return <ArrowUp className="ml-2 h-4 w-4" />;

	return <ArrowUpDown className="ml-2 h-4 w-4" />;
};

const SortingHeader = React.forwardRef<
	HTMLButtonElement,
	React.HTMLAttributes<HTMLButtonElement> & {
		column: Column<ClientListOutput>;
	}
>(({ column, children, ...props }, ref) => {
	const getNextSort = (sorted: false | SortDirection): boolean | undefined => {
		if (sorted === false) return false;
		if (sorted === "asc") return true;

		// sorted == desc
		return undefined;
	};

	return (
		<Button
			variant="ghost"
			onClick={() => column.toggleSorting(getNextSort(column.getIsSorted()))}
			ref={ref}
			{...props}
		>
			{children}
			<SortingIcon sorted={column.getIsSorted()} />
		</Button>
	);
});
SortingHeader.displayName = "SortingHeader";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
}

const DataTable = <TData, TValue>({
	columns,
	data,
}: DataTableProps<TData, TValue>) => {
	const [sorting, setSorting] = useState<SortingState>([]);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting,
		},
		initialState: {
			pagination: {
				pageSize: 20,
			},
		},
	});

	return (
		<div className="space-y-4">
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext()
													)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<DataTablePagination table={table} />
		</div>
	);
};

export default DataTable;

export { SortingHeader };
