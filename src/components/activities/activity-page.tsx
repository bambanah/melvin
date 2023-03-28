import ConfirmDialog from "@atoms/confirm-dialog";
import Dropdown from "@atoms/dropdown";
import Heading from "@atoms/heading";
import {
	faEllipsisV,
	faUser,
	faClock,
	faCalendar,
	faFileAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { trpc } from "@utils/trpc";
import dayjs from "dayjs";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-toastify";

const SupportItemPage = () => {
	const router = useRouter();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const activityId = String(router.query.id);

	const trpcContext = trpc.useContext();
	const { data: activity, error } = trpc.activity.byId.useQuery({
		id: activityId,
	});
	const deleteActivityMutation = trpc.activity.delete.useMutation();

	const deleteActivity = () => {
		deleteActivityMutation
			.mutateAsync({ id: activityId })
			.then(() => {
				trpcContext.activity.list.invalidate();
				toast.success("Activity deleted");
				router.push("/activities");
			})
			.catch(() => {
				toast.error("An error occured. Please refresh and try again.");
			});
	};

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!activity) return <div>loading...</div>;

	return (
		<div className="flex flex-col items-center justify-center px-8">
			<Head>
				<title>
					{`${activity.supportItem.description} - ${dayjs(activity.date).format(
						"DD/MM h:mm"
					)} | Melvin`}
				</title>
			</Head>
			<div className="flex w-full max-w-4xl flex-col gap-4 px-3">
				<ConfirmDialog
					title="Are you sure you want to delete this activity?"
					description="This cannot be undone."
					isOpen={isDeleteDialogOpen}
					setIsOpen={setIsDeleteDialogOpen}
					confirmText="Delete"
					cancelText="Cancel"
					confirmAction={deleteActivity}
				/>

				<div className="mb-2 flex items-center justify-between">
					<Heading className="medium text-lg sm:text-2xl">
						{activity.supportItem.description}
					</Heading>

					<Dropdown>
						<Dropdown.Button>
							<FontAwesomeIcon icon={faEllipsisV} />
						</Dropdown.Button>
						<Dropdown.Items>
							<Dropdown.Item>
								<Link
									href={`/activities/${activity.id}/edit`}
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

				<div className="flex items-center gap-2">
					<FontAwesomeIcon icon={faCalendar} />
					<p>{dayjs(activity.date).format("DD/MM/YY")}</p>
				</div>

				<div className="flex items-center gap-2">
					<FontAwesomeIcon icon={faClock} />
					<p>
						{dayjs(activity.startTime).format("hh:mma")} -{" "}
						{dayjs(activity.endTime).format("hh:mma")}
					</p>
				</div>

				<div className="flex items-center gap-2">
					<FontAwesomeIcon icon={faUser} />
					<Link href={`/clients/${activity.client?.id}`}>
						{activity.client?.name}
					</Link>
				</div>

				{activity.invoice && (
					<div className="flex items-center gap-2">
						<FontAwesomeIcon icon={faFileAlt} />
						<Link href={`/clients/${activity.client?.id}`}>
							{activity.invoice.invoiceNo}
						</Link>
					</div>
				)}
			</div>
		</div>
	);
};

export default SupportItemPage;
