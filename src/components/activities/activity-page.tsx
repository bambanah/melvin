import ActivityBreakdown from "@/components/activities/activity-breakdown";
import ActivityTripSummary from "@/components/activities/activity-trip-summary";
import { useRateContext } from "@/components/shared/use-rate-context";
import { Badge, InvoiceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Heading from "@/components/ui/heading";
import Loading from "@/components/ui/loading";
import { getRateForActivity } from "@/lib/billing-lines";
import { trpc } from "@/lib/trpc";
import { calculateTripTransit, standaloneTransit } from "@/lib/trip-utils";
import { InvoiceStatus } from "@/generated/browser";
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
	const rateContext = useRateContext();
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
	if (!activity) return <Loading />;

	// The support item code the SUPPORT line bills under, surfaced in the header.
	const [supportItemCode] = getRateForActivity(activity);

	// Whether this activity's Provider Travel labour minutes were capped at the
	// 30-min Travel Time Cap - drives the note on the breakdown's TRAVEL_TIME row.
	const travelTimeCapped = activity.trip
		? (calculateTripTransit(
				activity.trip.activities,
				activity.trip.interClientLegs
			).get(activity.id)?.durationCapped ?? false)
		: standaloneTransit(activity.client).durationCapped;

	// A frozen invoice (Sent/Paid) can legitimately differ from the live
	// breakdown - ADR 0005 says show the caveat and point at the invoice.
	const showLiveRatesCaveat =
		activity.invoice?.status === InvoiceStatus.SENT ||
		activity.invoice?.status === InvoiceStatus.PAID;

	return (
		<div className="flex flex-col items-center px-5">
			<Head>
				<title>
					{activity.supportItem.description} -{" "}
					{dayjs.utc(activity.date).format("DD/MM")} | Melvin
				</title>
			</Head>
			<div className="flex w-full max-w-4xl flex-col gap-4">
				<div className="my-2 flex items-start justify-between gap-2">
					<div className="flex flex-col gap-1">
						<Heading size="small">{activity.supportItem.description}</Heading>
						<p className="text-foreground/50 font-mono text-sm">
							{supportItemCode}
						</p>
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild className="grow-0">
							<Button variant="ghost" size="icon" aria-label="Activity actions">
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

				<div className="flex items-center gap-2">
					<FileText className="h-4 w-4" />
					{activity.invoice ? (
						<Link
							href={`/dashboard/invoices/${activity.invoice.id}`}
							className="flex items-center gap-2"
						>
							<span>{activity.invoice.invoiceNo}</span>
							<InvoiceStatusBadge invoiceStatus={activity.invoice.status} />
						</Link>
					) : (
						<Badge variant="secondary">Pending</Badge>
					)}
				</div>

				<ActivityBreakdown
					activity={activity}
					rateContext={rateContext}
					travelTimeCapped={travelTimeCapped}
					showLiveRatesCaveat={showLiveRatesCaveat}
				/>

				{activity.trip && (
					<ActivityTripSummary
						trip={activity.trip}
						currentActivityId={activity.id}
					/>
				)}
			</div>
		</div>
	);
};

export default ActivityPage;
