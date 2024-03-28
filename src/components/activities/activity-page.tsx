import ConfirmDialog from "@/components/ui/confirm-dialog";
import Dropdown from "@/components/ui/dropdown";
import Heading from "@/components/ui/heading";
import { trpc } from "@/lib/trpc";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
	Calendar,
	Car,
	Clock,
	EllipsisVertical,
	FileText,
	User,
} from "lucide-react";
import { useRouter } from "next/router";
dayjs.extend(utc);

const ActivityPage = ({ activityId }: { activityId: string }) => {
	const router = useRouter();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const trpcUtils = trpc.useUtils();
	const { data: activity, error } = trpc.activity.byId.useQuery({
		id: activityId,
	});
	const deleteActivityMutation = trpc.activity.delete.useMutation();

	const deleteActivity = () => {
		if (activityId)
			deleteActivityMutation
				.mutateAsync({ id: activityId })
				.then(() => {
					trpcUtils.activity.list.invalidate();
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
							<EllipsisVertical className="h-5 w-5" />
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
					<Calendar className="h-4 w-4" />
					<p>{dayjs.utc(activity.date).format("DD/MM/YY")}</p>
				</div>

				<div className="flex items-center gap-2">
					{activity.startTime && activity.endTime ? (
						<>
							<Clock className="h-4 w-4" />
							<p>
								{dayjs.utc(activity.startTime).format("hh:mma")} -{" "}
								{dayjs.utc(activity.endTime).format("hh:mma")}
							</p>
						</>
					) : (
						<>
							<Car className="h-4 w-4" />
							<p>{activity.itemDistance} km</p>
						</>
					)}
				</div>

				<div className="flex items-center gap-2">
					<User className="h-4 w-4" />
					<Link href={`/dashboard/clients/${activity.client?.id}`}>
						{activity.client?.name}
					</Link>
				</div>

				{activity.invoice && (
					<div className="flex items-center gap-2">
						<FileText className="h-4 w-4" />
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
