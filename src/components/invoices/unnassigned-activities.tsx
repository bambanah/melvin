import Heading from "@atoms/heading";
import { faCalendar, faClock, faCar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { InvoiceSchema } from "@schema/invoice-schema";
import { ActivityListOutput } from "@server/api/routers/activity-router";
import classNames from "classnames";
import dayjs from "dayjs";
import React from "react";
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

			<div className="flex flex-col gap-2">
				{activities.length > 0 ? (
					activities.map((activity) => (
						<label
							key={activity.id}
							className={classNames([
								"flex cursor-pointer gap-2 rounded-md border px-2 py-3 shadow-md transition-shadow hover:border-orange-500 md:p-4",
								getValues("activityIds")?.some((c) => c === activity.id)
									? "border-orange-300 bg-orange-50"
									: "bg-white",
							])}
							htmlFor={activity.id}
						>
							<input
								id={activity.id}
								type="checkbox"
								checked={getValues("activityIds")?.some(
									(c) => c === activity.id
								)}
								onChange={(val) => {
									if (val.target.checked) {
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
								className="w-5 cursor-pointer border bg-white outline-none ring-0"
							/>
							<div className="flex w-full flex-col gap-2 pl-1 md:pl-4">
								<p className="font-semibold">
									{activity.supportItem.description}
								</p>
								<div className="flex justify-start gap-6 text-sm md:text-sm">
									<span>
										<FontAwesomeIcon icon={faCalendar} />{" "}
										{dayjs.utc(activity.date).format("dddd DD/MM")}
									</span>
									{activity.startTime ? (
										<span className="">
											<FontAwesomeIcon icon={faClock} />{" "}
											{dayjs.utc(activity.startTime).format("h:mma")}-
											{dayjs.utc(activity.endTime).format("h:mma")}
										</span>
									) : (
										<span className="">
											<FontAwesomeIcon icon={faCar} /> {activity.itemDistance}{" "}
											km
										</span>
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
