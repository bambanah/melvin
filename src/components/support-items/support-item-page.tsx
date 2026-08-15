import {
	DetailHeader,
	DetailPage,
	DetailSection
} from "@/components/shared/detail-page";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Loading from "@/components/ui/loading";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { EllipsisVertical, Pencil, Trash } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

const periods = ["weekday", "weeknight", "saturday", "sunday"] as const;

const SupportItemPage = ({ supportItemId }: { supportItemId: string }) => {
	const router = useRouter();

	const trpcUtils = trpc.useUtils();
	const { data: supportItem, error } = trpc.supportItem.byId.useQuery({
		id: supportItemId ?? ""
	});
	const deletesupportItemMutation = trpc.supportItem.delete.useMutation();

	const deletesupportItem = () => {
		if (confirm("Are you sure?"))
			deletesupportItemMutation
				.mutateAsync({ id: supportItemId })
				.then(() => {
					trpcUtils.supportItem.list.invalidate();
					toast.success("Support Item deleted");
					router.push("/dashboard/support-items");
				})
				.catch(() => {
					toast.error("An error occurred. Please refresh and try again.");
				});
	};

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!supportItem) return <Loading />;

	const perUnit = supportItem.rateType === "KM" ? "km" : "hr";

	return (
		<DetailPage>
			<Head>
				<title>{`${supportItem.description} | Melvin`}</title>
			</Head>

			<DetailHeader
				eyebrow={
					supportItem.rateType === "KM" ? "Billed per km" : "Billed per hour"
				}
				title={supportItem.description}
				subline={supportItem.weekdayCode}
				actions={
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Support item actions"
							>
								<EllipsisVertical />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<Link href={`/dashboard/support-items/${supportItem.id}/edit`}>
								<DropdownMenuItem className="cursor-pointer">
									<Pencil className="mr-2 h-4 w-4" />
									<span>Edit</span>
								</DropdownMenuItem>
							</Link>

							<DropdownMenuItem
								onClick={() => deletesupportItem()}
								className="text-destructive focus:text-destructive cursor-pointer"
							>
								<Trash className="mr-2 h-4 w-4" />
								<span>Delete</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				}
			/>

			<DetailSection title="Rates">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Period</TableHead>
							<TableHead>Code</TableHead>
							<TableHead className="text-right">Rate</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{periods.map((period) =>
							supportItem[`${period}Code`] ? (
								<TableRow key={period}>
									<TableCell>
										{period.charAt(0).toUpperCase() + period.slice(1)}
									</TableCell>
									<TableCell className="font-mono text-xs">
										{supportItem[`${period}Code`]}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{Number(supportItem[`${period}Rate`]).toLocaleString(
											undefined,
											{ style: "currency", currency: "AUD" }
										)}
										<span className="text-foreground/50">/{perUnit}</span>
									</TableCell>
								</TableRow>
							) : null
						)}
					</TableBody>
				</Table>
			</DetailSection>
		</DetailPage>
	);
};

export default SupportItemPage;
