import ActivityForm from "@/components/activities/activity-form";
import Layout from "@/components/shared/layout";
import { Separator } from "@/components/ui/separator";
import { getTotalCostOfActivities } from "@/lib/activity-utils";
import { trpc } from "@/lib/trpc";
import dayjs from "dayjs";

const DashboardPage = () => {
	const { data: pendingActivities } = trpc.activity.pending.useQuery();

	return (
		<Layout className="mx-auto w-full max-w-4xl gap-4 px-4 sm:flex-row sm:justify-evenly">
			<div className="flex-auto basis-1/2 sm:pr-4">
				<h1 className="mb-4 text-2xl">Hello, Phoebe</h1>

				<ActivityForm />
			</div>

			<Separator className="sm:hidden" />

			<div className="flex flex-auto flex-col gap-4 sm:pl-4">
				<h1 className="text-2xl">Pending Work</h1>

				{pendingActivities && (
					<div className="flex flex-col gap-4 text-sm">
						{Object.entries(pendingActivities).map(
							([clientName, activities]) => (
								<div key={clientName}>
									<h1 className="text-base">{clientName}</h1>

									<div className="flex flex-col gap-2 pt-2 pl-2">
										{activities.map(({ id, date, startTime, endTime }, idx) => (
											<div
												key={id}
												className="flex items-center justify-between gap-2"
											>
												<div className="flex flex-col">
													<p>{dayjs(date).format("ddd MMMM DD, YYYY")}</p>
													<p className="text-muted-foreground text-sm">
														{dayjs(startTime).format("h:mm A")} -{" "}
														{dayjs.utc(endTime).format("h:mm A")}
													</p>
												</div>
												<span>
													{getTotalCostOfActivities([
														activities[idx]
													]).toLocaleString(undefined, {
														style: "currency",
														currency: "AUD",
														minimumFractionDigits: 0
													})}
												</span>
											</div>
										))}
									</div>
								</div>
							)
						)}
					</div>
				)}
			</div>
		</Layout>
	);
};

export default DashboardPage;
