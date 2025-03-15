import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Heading from "@/components/ui/heading";
import { trpc } from "@/lib/trpc";
import {
	Calendar,
	Car,
	Clock,
	EllipsisVertical,
	FileText,
	Pencil,
	Trash,
	User
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/utc"));

const ActivityPage = ({ activityId }: { activityId: string }) => {
	const router = useRouter();

	const trpcUtils = trpc.useUtils();
	const { data: activity, error } = trpc.activity.byId.useQuery({
		id: activityId
	});
	const deleteActivityMutation = trpc.activity.delete.useMutation();

	const deleteActivity = () => {
		if (confirm("Are you sure?"))
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
				<div className="my-2 flex items-center justify-between">
					<Heading size="small">{activity.supportItem.description}</Heading>

					<DropdownMenu>
						<DropdownMenuTrigger asChild className="grow-0">
							<Button variant="ghost" size="icon">
								<EllipsisVertical />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<Link href={`/dashboard/activities/${activity.id}/edit`}>
								<DropdownMenuItem className="cursor-pointer">
									<Pencil className="mr-2 h-4 w-4" />
									<span>Edit</span>
								</DropdownMenuItem>
							</Link>

							<DropdownMenuItem
								onClick={() => deleteActivity()}
								className="cursor-pointer"
							>
								<Trash className="mr-2 h-4 w-4" />
								<span>Delete</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
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
