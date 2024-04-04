import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Heading from "@/components/ui/heading";
import { trpc } from "@/lib/trpc";
import { EllipsisVertical, Pencil, Trash } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

const SupportItemPage = ({ supportItemId }: { supportItemId: string }) => {
	const router = useRouter();

	const trpcUtils = trpc.useUtils();
	const { data: supportItem, error } = trpc.supportItem.byId.useQuery({
		id: supportItemId ?? "",
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
					toast.error("An error occured. Please refresh and try again.");
				});
	};

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!supportItem) return <div>loading...</div>;

	return (
		<div className="flex flex-col items-center justify-center">
			<Head>
				<title>{supportItem.description} | Melvin</title>
			</Head>

			<div className="flex w-full max-w-4xl flex-col gap-4 md:gap-8">
				<div className="my-5 mb-2 flex items-center justify-between px-5">
					<Heading>{supportItem.description}</Heading>

					<DropdownMenu>
						<DropdownMenuTrigger asChild className="grow-0 ">
							<Button variant="ghost" size="icon">
								<EllipsisVertical />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<Link href={`/dashboard/support-items/${supportItem.id}/edit`}>
								<DropdownMenuItem className="cursor-pointer">
									<Pencil className="mr-2 h-4 w-4" />
									<span>Edit</span>
								</DropdownMenuItem>
							</Link>

							<DropdownMenuItem
								onClick={() => deletesupportItem()}
								className="cursor-pointer"
							>
								<Trash className="mr-2 h-4 w-4" />
								<span>Delete</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<table className="mt-8 w-full table-auto border-collapse text-sm md:text-base [&_td]:border-t [&_td]:p-2 [&_th]:px-2 [&_th]:py-1">
					<thead className="text-left text-lg md:text-xl">
						<tr>
							<th>Period</th>
							<th>Code</th>
							<th>Rate</th>
						</tr>
					</thead>
					<tbody className="[&_td]:p-2">
						{(["weekday", "weeknight", "saturday", "sunday"] as const).map(
							(day) =>
								supportItem[`${day}Code`] ? (
									<tr className="mt-4 text-left" key={day}>
										<td>{day.charAt(0).toUpperCase() + day.slice(1)}</td>
										<td className="">{supportItem[`${day}Code`]}</td>
										<td>
											{Number(supportItem[`${day}Rate`]).toLocaleString(
												undefined,
												{
													style: "currency",
													currency: "AUD",
												}
											)}
											/{supportItem.rateType === "KM" ? "km" : "hr"}
										</td>
									</tr>
								) : null
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default SupportItemPage;
