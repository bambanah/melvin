import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as React from "react";

interface SummingDistanceInputProps {
	value?: number;
	onChange?: (value: number | undefined) => void;
	onBlur?: () => void;
	className?: string;
	placeholder?: string;
}

function parseDistanceValues(input: string): number[] {
	// Remove "km" suffix if present
	const cleaned = input.replace(/km/gi, "").trim();

	// Split by whitespace, comma, or plus
	const parts = cleaned.split(/[\s,+]+/).filter(Boolean);

	return parts.map((p) => parseFloat(p)).filter((n) => !isNaN(n) && n >= 0);
}

export function SummingDistanceInput({
	value,
	onChange,
	onBlur,
	className,
	placeholder = "25 12"
}: SummingDistanceInputProps) {
	const [rawValue, setRawValue] = React.useState("");
	const [isFocused, setIsFocused] = React.useState(false);
	const [showTotal, setShowTotal] = React.useState(false);

	React.useEffect(() => {
		if (!isFocused && value !== undefined) {
			setRawValue(value.toString());
		}
	}, [value, isFocused]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setRawValue(e.target.value);
		setShowTotal(false);
	};

	const handleBlur = () => {
		setIsFocused(false);
		const values = parseDistanceValues(rawValue);

		if (values.length === 0) {
			onChange?.(undefined);
			setRawValue("");
			setShowTotal(false);
		} else {
			const total = values.reduce((sum, v) => sum + v, 0);
			onChange?.(total);

			// Show total if there were multiple values
			if (values.length > 1) {
				setShowTotal(true);
			} else {
				setRawValue(total.toString());
			}
		}

		onBlur?.();
	};

	const handleFocus = () => {
		setIsFocused(true);
		setShowTotal(false);
	};

	const values = parseDistanceValues(rawValue);
	const total = values.reduce((sum, v) => sum + v, 0);

	return (
		<div className="relative">
			<Input
				type="text"
				value={rawValue}
				onChange={handleChange}
				onBlur={handleBlur}
				onFocus={handleFocus}
				placeholder={placeholder}
				className={cn("pr-12", className)}
			/>
			<span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
				km
			</span>
			{showTotal && values.length > 1 && !isFocused && (
				<div className="text-muted-foreground mt-1 text-xs">
					= {total} km total
				</div>
			)}
		</div>
	);
}
