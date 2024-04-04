import { Checkbox } from "@/components/ui/checkbox";
import Heading from "@/components/ui/heading";
import { cn } from "@/lib/utils";
import { InvoiceSchema } from "@/schema/invoice-schema";
import { ActivityListOutput } from "@/server/api/routers/activity-router";
import dayjs from "dayjs";
import { Calendar, Car, Clock } from "lucide-react";
import { UseFormGetValues, UseFormSetValue } from "react-hook-form";

interface Props {
	activities: ActivityListOutput["activities"];
	getValues: UseFormGetValues<InvoiceSchema>;
	setValue: UseFormSetValue<InvoiceSchema>;
}

const UnassignedActivities = ({ activities, getValues, setValue }: Props) => {
	return (
		<div className="flex flex-col gap-2">
			<Heading size="xsmall">Unassigned Activities</Heading>
			<p className="text-foreground/80">
				Select any activities you&#39;d like to add to this invoice.
			</p>

			<div className="mt-4 flex flex-col gap-2">
				{activities.length > 0 ? (
					activities.map((activity) => (
						<label
							key={activity.id}
							className={cn([
								"flex cursor-pointer items-center gap-2 rounded-md border px-2 py-3 shadow-md transition-shadow hover:border-orange-500 md:p-4",
								getValues("activityIds")?.some((c) => c === activity.id)
									? "border-primary/20 bg-primary/10"
									: "bg-background",
							])}
							htmlFor={activity.id}
						>
							<Checkbox
								id={activity.id}
								checked={getValues("activityIds")?.some(
									(c) => c === activity.id
								)}
								onCheckedChange={(checked) => {
									if (checked) {
										const activityIds = getValues("activityIds") ?? [];
										setValue("activityIds", [...activityIds, activity.id], {
											shouldTouch: true,
											shouldValidate: true,
										});
									} else {
										setValue(
											"activityIds",
											getValues("activityIds")?.filter(
												(v) => v !== activity.id
											) ?? [],
											{ shouldTouch: true, shouldValidate: true }
										);
									}
								}}
							/>
							<div className="flex w-full flex-col gap-2 pl-1 md:pl-4">
								<p className="font-semibold">
									{activity.supportItem.description}
								</p>
								<div className="flex justify-start gap-6 text-sm md:text-sm">
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										{dayjs.utc(activity.date).format("dddd DD/MM")}
									</div>
									{activity.startTime && activity.endTime ? (
										<div className="flex items-center gap-2">
											<Clock className="h-4 w-4" />
											{dayjs.utc(activity.startTime).format("h:mma")}-
											{dayjs.utc(activity.endTime).format("h:mma")}
										</div>
									) : (
										<div className="flex items-center gap-2">
											<Car className="h-4 w-4" /> {activity.itemDistance} km
										</div>
									)}
								</div>
							</div>
						</label>
					))
				) : (
					<p>Nothing</p>
				)}
			</div>
		</div>
	);
};

export default UnassignedActivities;
