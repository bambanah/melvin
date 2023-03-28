import ConfirmDialog from "@atoms/confirm-dialog";
import Dropdown from "@atoms/dropdown";
import Heading from "@atoms/heading";
import { faEllipsisV, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { trpc } from "@utils/trpc";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-toastify";

const SupportItemPage = () => {
	const router = useRouter();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const supportItemId = String(router.query.id);

	const trpcContext = trpc.useContext();
	const { data: supportItem, error } = trpc.supportItem.byId.useQuery({
		id: supportItemId,
	});
	const deletesupportItemMutation = trpc.supportItem.delete.useMutation();

	const deletesupportItem = () => {
		deletesupportItemMutation
			.mutateAsync({ id: supportItemId })
			.then(() => {
				trpcContext.supportItem.list.invalidate();
				toast.success("Support Item deleted");
				router.push("/support-items");
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
				<title>{`${supportItem.description} | Melvin`}</title>
			</Head>

			<div className="flex w-full max-w-4xl flex-col gap-4 md:gap-8">
				<ConfirmDialog
					title="Are you sure you want to delete this Support Item?"
					description="This cannot be undone."
					isOpen={isDeleteDialogOpen}
					setIsOpen={setIsDeleteDialogOpen}
					confirmText="Delete"
					cancelText="Cancel"
					confirmAction={deletesupportItem}
				/>

				<div className="mb-2 flex items-center justify-between px-3 pt-5">
					<Heading>{supportItem.description}</Heading>

					<Dropdown>
						<Dropdown.Button>
							<FontAwesomeIcon icon={faEllipsisV} />
						</Dropdown.Button>
						<Dropdown.Items>
							<Dropdown.Item>
								<Link
									href={`/support-items/${supportItem.id}/edit`}
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

				<table className="w-full table-auto border-collapse text-sm md:text-base [&_td]:border-t [&_td]:p-2 [&_th]:px-2 [&_th]:py-1">
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
