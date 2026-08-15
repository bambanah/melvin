import ActivityBreakdown from "@/components/activities/activity-breakdown";
import ActivityTripSummary from "@/components/activities/activity-trip-summary";
import { DetailHeader, DetailPage } from "@/components/shared/detail-page";
import { Fact, FactGrid } from "@/components/shared/fact";
import { useRateContext } from "@/components/shared/use-rate-context";
import { Badge, InvoiceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Loading from "@/components/ui/loading";
import { getRateForActivity } from "@/lib/billing-lines";
import { trpc } from "@/lib/trpc";
import { calculateTripTransit, standaloneTransit } from "@/lib/trip-utils";
import { InvoiceStatus } from "@/generated/browser";
import {
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

import { utcDate } from "@/lib/date-utils";
import { differenceInMinutes, format } from "date-fns";

const formatDuration = (minutes: number) => {
	const hours = Math.floor(minutes / 60);
	const mins = Math.round(minutes % 60);
	if (hours === 0) return `${mins} min`;
	if (mins === 0) return `${hours} hr`;
	return `${hours} hr ${mins} min`;
};

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
					toast.error("An error occurred. Please refresh and try again.");
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

	const hasTimes = Boolean(activity.startTime && activity.endTime);
	const durationMinutes = hasTimes
		? differenceInMinutes(
				activity.endTime ?? new Date(0),
				activity.startTime ?? new Date(0)
			)
		: 0;

	return (
		<DetailPage>
			<Head>
				<title>
					{`${activity.supportItem.description} - ${format(
						utcDate(activity.date),
						"dd/MM"
					)} | Melvin`}
				</title>
			</Head>
			<DetailHeader
				eyebrow={format(utcDate(activity.date), "EEEE, d MMMM yyyy")}
				title={activity.supportItem.description}
				subline={supportItemCode}
				actions={
					<>
						<Button
							asChild
							variant="outline"
							size="sm"
							className="hidden sm:inline-flex"
						>
							<Link href={`/dashboard/activities/${activity.id}/edit`}>
								<Pencil />
								Edit
							</Link>
						</Button>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label="Activity actions"
								>
									<EllipsisVertical />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<Link href={`/dashboard/activities/${activity.id}/edit`}>
									<DropdownMenuItem className="cursor-pointer sm:hidden">
										<Pencil className="mr-2 h-4 w-4" />
										<span>Edit</span>
									</DropdownMenuItem>
								</Link>

								<DropdownMenuItem
									onClick={() => deleteActivity()}
									className="text-destructive focus:text-destructive cursor-pointer"
								>
									<Trash className="mr-2 h-4 w-4" />
									<span>Delete</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				}
			>
				<FactGrid>
					{hasTimes ? (
						<Fact icon={Clock} label="Time">
							{format(utcDate(activity.startTime ?? new Date(0)), "h:mmaaa")} -{" "}
							{format(utcDate(activity.endTime ?? new Date(0)), "h:mmaaa")}
							<span className="text-foreground/50 font-normal">
								{" "}
								· {formatDuration(durationMinutes)}
							</span>
						</Fact>
					) : (
						<Fact icon={Car} label="Distance">
							{activity.itemDistance} km
						</Fact>
					)}

					<Fact icon={User} label="Client">
						<Link
							href={`/dashboard/clients/${activity.client?.id}`}
							className="decoration-foreground/30 hover:decoration-foreground underline underline-offset-4 transition-colors"
						>
							{activity.client?.name}
						</Link>
					</Fact>

					<Fact icon={FileText} label="Invoice">
						{activity.invoice ? (
							<Link
								href={`/dashboard/invoices/${activity.invoice.id}`}
								className="flex items-center gap-2"
							>
								<span className="decoration-foreground/30 hover:decoration-foreground underline underline-offset-4 transition-colors">
									{activity.invoice.invoiceNo}
								</span>
								<InvoiceStatusBadge invoiceStatus={activity.invoice.status} />
							</Link>
						) : (
							<Badge variant="secondary">Pending</Badge>
						)}
					</Fact>
				</FactGrid>
			</DetailHeader>

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
		</DetailPage>
	);
};

export default ActivityPage;
