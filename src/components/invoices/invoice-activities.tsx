import { utcDate } from "@/lib/date-utils";
import type { InvoiceByIdOutput } from "@/server/api/routers/invoice-router";
import { format } from "date-fns";
import Link from "next/link";

const activityDetail = (activity: InvoiceByIdOutput["activities"][number]) => {
	const date = format(utcDate(activity.date), "EEEE d MMM yyyy");

	if (activity.startTime && activity.endTime) {
		return `${date} · ${format(utcDate(activity.startTime), "h:mmaaa")} - ${format(
			utcDate(activity.endTime),
			"h:mmaaa"
		)}`;
	}
	if (activity.itemDistance) {
		return `${date} · ${activity.itemDistance} km`;
	}
	return date;
};

/**
 * The activities billed on this invoice - straight off `invoice.byId`, so no
 * second query, and rendered at every viewport.
 */
function InvoiceActivities({ invoice }: { invoice: InvoiceByIdOutput }) {
	return (
		<section className="bg-card overflow-hidden rounded-xl border">
			<div className="border-b px-5 py-3.5">
				<h2 className="text-sm font-semibold">
					Activities · {invoice.activities.length}
				</h2>
			</div>

			{invoice.activities.length === 0 ? (
				<p className="text-foreground/50 px-5 py-4 text-sm">
					No activities on this invoice yet.
				</p>
			) : (
				<div className="divide-y px-5">
					{invoice.activities.map((activity) => (
						<div key={activity.id} className="flex flex-col gap-0.5 py-4">
							<Link
								href={`/dashboard/activities/${activity.id}`}
								className="decoration-foreground/30 hover:decoration-foreground w-fit text-sm font-medium underline underline-offset-4 transition-colors"
							>
								{activity.supportItem.description}
							</Link>
							<p className="text-foreground/60 text-xs">
								{activityDetail(activity)}
							</p>
						</div>
					))}
				</div>
			)}
		</section>
	);
}

export default InvoiceActivities;
