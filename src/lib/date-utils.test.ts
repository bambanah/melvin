import { formatDuration, getDuration } from "@/lib/date-utils";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const dateFromTime = (time: string) => dayjs.utc(`1970-01-01T${time}`).toDate();

it("Should get duration", () => {
	expect(getDuration(dateFromTime("12:00"), dateFromTime("13:00"))).toEqual(1);
	expect(getDuration(dateFromTime("12:00"), dateFromTime("13:01"))).toEqual(
		1.016_666_666_666_666_6
	);
	expect(getDuration(dateFromTime("10:00"), dateFromTime("18:05"))).toEqual(
		8.083_333_333_333_334
	);
	expect(getDuration(dateFromTime("09:00"), dateFromTime("09:14"))).toEqual(
		0.233_333_333_333_333_34
	);
	expect(getDuration(dateFromTime("09:30"), dateFromTime("15:10"))).toEqual(
		5.666_666_666_666_667
	);
});

it("Should get pretty duration", () => {
	expect(
		formatDuration(getDuration(dateFromTime("12:00"), dateFromTime("13:00")))
	).toEqual("1 hour");

	expect(
		formatDuration(getDuration(dateFromTime("12:00"), dateFromTime("13:01")))
	).toEqual("1 hour, 1 min");

	expect(
		formatDuration(getDuration(dateFromTime("13:00"), dateFromTime("15:00")))
	).toEqual("2 hours");

	expect(
		formatDuration(getDuration(dateFromTime("13:00"), dateFromTime("15:30")))
	).toEqual("2 hours, 30 mins");

	expect(
		formatDuration(getDuration(dateFromTime("01:20"), dateFromTime("15:00")))
	).toEqual("13 hours, 40 mins");

	expect(
		formatDuration(getDuration(dateFromTime("09:12"), dateFromTime("13:34")))
	).toEqual("4 hours, 22 mins");

	expect(
		formatDuration(getDuration(dateFromTime("09:00"), dateFromTime("09:14")))
	).toEqual("14 mins");
});
