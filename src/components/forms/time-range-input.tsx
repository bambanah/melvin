import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as React from "react";

export interface TimeRangeValue {
	startTime: string;
	endTime: string;
}

interface TimeRangeInputProps {
	value?: TimeRangeValue;
	onChange?: (value: TimeRangeValue) => void;
	onBlur?: () => void;
	className?: string;
	error?: string;
}

function normalizeTime(input: string): string | null {
	const cleaned = input.replace(/[^0-9:]/g, "");

	// Handle formats: "930", "9:30", "09:30", "0930"
	let hours: number;
	let minutes: number;

	if (cleaned.includes(":")) {
		const [h, m] = cleaned.split(":");
		hours = parseInt(h, 10);
		minutes = parseInt(m, 10);
	} else if (cleaned.length <= 2) {
		hours = parseInt(cleaned, 10);
		minutes = 0;
	} else if (cleaned.length === 3) {
		hours = parseInt(cleaned[0], 10);
		minutes = parseInt(cleaned.slice(1), 10);
	} else if (cleaned.length === 4) {
		hours = parseInt(cleaned.slice(0, 2), 10);
		minutes = parseInt(cleaned.slice(2), 10);
	} else {
		return null;
	}

	if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) {
		return null;
	}

	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function parseTimeRange(input: string): TimeRangeValue | null {
	const separators = ["-", "–", "—", " - ", " – ", " — ", "to", " to "];
	let parts: string[] = [];

	for (const sep of separators) {
		if (input.includes(sep)) {
			parts = input.split(sep).map((p) => p.trim());
			break;
		}
	}

	if (parts.length !== 2) return null;

	const startTime = normalizeTime(parts[0]);
	const endTime = normalizeTime(parts[1]);

	if (!startTime || !endTime) return null;

	return { startTime, endTime };
}

function formatTimeRangeForDisplay(value: TimeRangeValue): string {
	if (!value.startTime && !value.endTime) return "";
	return `${value.startTime || ""}-${value.endTime || ""}`;
}

export function TimeRangeInput({
	value,
	onChange,
	onBlur,
	className,
	error
}: TimeRangeInputProps) {
	const [rawValue, setRawValue] = React.useState("");
	const [isFocused, setIsFocused] = React.useState(false);

	React.useEffect(() => {
		if (!isFocused && value) {
			setRawValue(formatTimeRangeForDisplay(value));
		}
	}, [value, isFocused]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setRawValue(e.target.value);
	};

	const handleBlur = () => {
		setIsFocused(false);
		const parsed = parseTimeRange(rawValue);
		if (parsed) {
			onChange?.(parsed);
			setRawValue(formatTimeRangeForDisplay(parsed));
		}
		onBlur?.();
	};

	const handleFocus = () => {
		setIsFocused(true);
	};

	return (
		<Input
			type="text"
			value={rawValue}
			onChange={handleChange}
			onBlur={handleBlur}
			onFocus={handleFocus}
			placeholder="9:30-13:50"
			className={cn(error && "border-destructive", className)}
			data-testid="time-range-input"
		/>
	);
}

/** Parse a strict "HH:MM" string into minutes-since-midnight, or null if the
 * string is malformed or out of range (hours 0-23, minutes 0-59). */
function timeToMinutes(time: string): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(time);
	if (!match) return null;

	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > 23 || minutes > 59) return null;

	return hours * 60 + minutes;
}

export function validateTimeRange(
	value: TimeRangeValue | undefined
): string | null {
	if (!value?.startTime || !value?.endTime) {
		return "Time range is required";
	}

	const startMinutes = timeToMinutes(value.startTime);
	const endMinutes = timeToMinutes(value.endTime);

	if (startMinutes === null || endMinutes === null) {
		return "Invalid time";
	}

	if (endMinutes <= startMinutes) {
		return "End time must be after start time";
	}

	return null;
}
