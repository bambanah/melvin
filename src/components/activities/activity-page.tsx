import ConfirmDialog from "@/components/atoms/confirm-dialog";
import Dropdown from "@/components/atoms/dropdown";
import Heading from "@/components/atoms/heading";
import {
	faCalendar,
	faCar,
	faClock,
	faEllipsisV,
	faFileAlt,
	faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { trpc } from "@/lib/trpc";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useRouter } from "next/router";
dayjs.extend(utc);

const ActivityPage = ({ activityId }: { activityId: string }) => {
	const router = useRouter();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const trpcContext = trpc.useContext();
	const { data: activity, error } = trpc.activity.byId.useQuery({
		id: activityId,
	});
	const deleteActivityMutation = trpc.activity.delete.useMutation();

	const deleteActivity = () => {
		if (activityId)
			deleteActivityMutation
				.mutateAsync({ id: activityId })
				.then(() => {
					trpcContext.activity.list.invalidate();
					toast.success("Activity deleted");
					router.push("/dashboard/activities");
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
		<div className="flex flex-col items-center justify-center px-5">
			<Head>
				<title>
					{activity.supportItem.description} -{" "}
					{dayjs.utc(activity.date).format("DD/MM")} | Melvin
				</title>
			</Head>
			<div className="flex w-full max-w-4xl flex-col gap-4">
				<ConfirmDialog
					title="Are you sure you want to delete this activity?"
					description="This cannot be undone."
					isOpen={isDeleteDialogOpen}
					setIsOpen={setIsDeleteDialogOpen}
					confirmText="Delete"
					cancelText="Cancel"
					confirmAction={deleteActivity}
				/>

				<div className="my-2 flex items-center justify-between">
					<Heading size="small">{activity.supportItem.description}</Heading>

					<Dropdown>
						<Dropdown.Button id="options-dropdown">
							<FontAwesomeIcon icon={faEllipsisV} />
						</Dropdown.Button>
						<Dropdown.Items>
							<Dropdown.Item>
								<Link
									href={`/dashboard/activities/${activity.id}/edit`}
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
					<p>{dayjs.utc(activity.date).format("DD/MM/YY")}</p>
				</div>

				<div className="flex items-center gap-2">
					{activity.startTime && activity.endTime ? (
						<>
							<FontAwesomeIcon icon={faClock} />
							<p>
								{dayjs.utc(activity.startTime).format("hh:mma")} -{" "}
								{dayjs.utc(activity.endTime).format("hh:mma")}
							</p>
						</>
					) : (
						<>
							<FontAwesomeIcon icon={faCar} />
							<p>{activity.itemDistance} km</p>
						</>
					)}
				</div>

				<div className="flex items-center gap-2">
					<FontAwesomeIcon icon={faUser} />
					<Link href={`/dashboard/clients/${activity.client?.id}`}>
						{activity.client?.name}
					</Link>
				</div>

				{activity.invoice && (
					<div className="flex items-center gap-2">
						<FontAwesomeIcon icon={faFileAlt} />
						<Link href={`/dashboard/clients/${activity.client?.id}`}>
							{activity.invoice.invoiceNo}
						</Link>
					</div>
				)}
			</div>
		</div>
	);
};

export default ActivityPage;
