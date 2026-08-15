import {
	DetailHeader,
	DetailPage,
	DetailSection
} from "@/components/shared/detail-page";
import { Badge } from "@/components/ui/badge";
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
import { getPriceLimit } from "@/lib/support-item-utils";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import type { SupportItemByIdOutput } from "@/server/api/routers/support-item-router";
import { EllipsisVertical, Pencil, Trash } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

/** The four Day Rates, in the order `getRateForActivity` resolves them. */
const dayRates = [
	{ period: "weekday", label: "Weekday", when: "Before 8pm" },
	{ period: "weeknight", label: "Weeknight", when: "8pm or later" },
	{ period: "saturday", label: "Saturday", when: "All day" },
	{ period: "sunday", label: "Sunday", when: "All day" }
] as const;

const Muted = ({ children }: { children: React.ReactNode }) => (
	<span className="text-foreground/50">{children}</span>
);

const RateCell = ({
	rate,
	code,
	perUnit
}: {
	rate: number;
	code: string;
	perUnit: string;
}) => {
	const priceLimit = getPriceLimit(code);

	return (
		<>
			{formatCurrency(rate)}
			<Muted>/{perUnit}</Muted>
			{priceLimit !== undefined && (
				<p
					className={`text-xs font-normal ${
						rate > priceLimit ? "text-destructive" : "text-foreground/50"
					}`}
				>
					{rate > priceLimit ? "Over " : ""}NDIS cap{" "}
					{formatCurrency(priceLimit)}
				</p>
			)}
		</>
	);
};

const DayRates = ({
	supportItem,
	perUnit
}: {
	supportItem: SupportItemByIdOutput;
	perUnit: string;
}) => (
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>Day</TableHead>
				<TableHead>Code</TableHead>
				<TableHead className="text-right">Rate</TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{dayRates.map(({ period, label, when }) => {
				const code = supportItem[`${period}Code`];
				const rate = supportItem[`${period}Rate`];

				return (
					<TableRow key={period}>
						<TableCell>
							{label}
							<p className="text-foreground/50 text-xs">{when}</p>
						</TableCell>
						<TableCell className="font-mono text-xs">
							{code || <Muted>-</Muted>}
						</TableCell>
						<TableCell className="text-right align-top tabular-nums">
							{code && rate ? (
								<RateCell rate={Number(rate)} code={code} perUnit={perUnit} />
							) : (
								<Muted>Same as weekday</Muted>
							)}
						</TableCell>
					</TableRow>
				);
			})}
		</TableBody>
	</Table>
);

const ClientOverrides = ({ supportItemId }: { supportItemId: string }) => {
	const { data: customRates } = trpc.supportItem.getCustomRatesForItem.useQuery(
		{ id: supportItemId }
	);

	if (!customRates) return null;

	return (
		<DetailSection
			title="Client overrides"
			caption="Custom rates that beat this item's own"
		>
			{customRates.length === 0 ? (
				<p className="text-foreground/50 px-5 py-4 text-sm">
					No client overrides - every client bills the rates above.
				</p>
			) : (
				<ul className="divide-y">
					{customRates.map((customRate) => (
						<li
							key={customRate.id}
							className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm"
						>
							<Link
								href={`/dashboard/clients/${customRate.client?.id}`}
								className="decoration-foreground/30 hover:decoration-foreground font-medium underline underline-offset-4 transition-colors"
							>
								{customRate.client?.name}
							</Link>
							<div className="flex flex-wrap gap-x-3 tabular-nums">
								{dayRates.map(({ period, label }) =>
									customRate[`${period}Rate`] ? (
										<span key={period}>
											<Muted>{label} </Muted>
											{formatCurrency(Number(customRate[`${period}Rate`]))}
										</span>
									) : null
								)}
							</div>
						</li>
					))}
				</ul>
			)}
		</DetailSection>
	);
};

const SupportItemPage = ({ supportItemId }: { supportItemId: string }) => {
	const router = useRouter();

	const trpcUtils = trpc.useUtils();
	const { data: supportItem, error } = trpc.supportItem.byId.useQuery({
		id: supportItemId ?? ""
	});
	const { data: user } = trpc.user.fetch.useQuery();
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
				.catch((error) => {
					toast.error(
						error instanceof Error
							? error.message
							: "An error occurred. Please refresh and try again."
					);
				});
	};

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!supportItem) return <Loading />;

	const perUnit = supportItem.rateType === "KM" ? "km" : "hr";
	const isDefault =
		user?.defaultSupportItemId === supportItem.id ||
		user?.defaultGroupSupportItemId === supportItem.id;

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
				badge={
					<>
						{supportItem.isGroup && <Badge variant="secondary">Group</Badge>}
						{isDefault && (
							<Badge variant="secondary" className="whitespace-nowrap">
								Default
							</Badge>
						)}
					</>
				}
				subline={supportItem.weekdayCode}
				actions={
					<>
						<Button
							asChild
							variant="outline"
							size="sm"
							className="hidden sm:inline-flex"
						>
							<Link href={`/dashboard/support-items/${supportItem.id}/edit`}>
								<Pencil />
								Edit
							</Link>
						</Button>

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
									<DropdownMenuItem className="cursor-pointer sm:hidden">
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
					</>
				}
			/>

			<DetailSection
				title="Day rates"
				caption={
					supportItem.isGroup
						? "The full session amount - each participant bills a share"
						: "The code and rate an activity bills under"
				}
			>
				<DayRates supportItem={supportItem} perUnit={perUnit} />
			</DetailSection>

			<ClientOverrides supportItemId={supportItem.id} />
		</DetailPage>
	);
};

export default SupportItemPage;
