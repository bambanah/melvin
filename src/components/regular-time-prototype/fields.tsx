// PROTOTYPE - throwaway (#502). The four Regular Time inputs, shared by the
// variants whose question is placement rather than the inputs themselves.
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { type RegularTime, useSoloHourlyItems, validate } from "./store";

export function RegularTimeFields({
	value,
	onChange,
	hasDistance,
	showErrors
}: {
	value: RegularTime;
	onChange: (value: RegularTime) => void;
	hasDistance: boolean;
	showErrors?: boolean;
}) {
	const { items } = useSoloHourlyItems();
	const error = showErrors ? validate(value) : null;

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="rt-start">Start</Label>
					<Input
						id="rt-start"
						type="time"
						value={value.startTime}
						onChange={(e) => onChange({ ...value, startTime: e.target.value })}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="rt-end">End</Label>
					<Input
						id="rt-end"
						type="time"
						value={value.endTime}
						onChange={(e) => onChange({ ...value, endTime: e.target.value })}
					/>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label>Support Item</Label>
				<Select
					value={value.supportItemId}
					onValueChange={(supportItemId) =>
						onChange({ ...value, supportItemId })
					}
				>
					<SelectTrigger>
						<SelectValue placeholder="Pick a solo hourly item" />
					</SelectTrigger>
					<SelectContent>
						{items.map((i) => (
							<SelectItem key={i.id} value={i.id}>
								{i.description}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className="text-foreground/50 text-xs">Solo, hourly items only</p>
			</div>

			<label className="flex items-start gap-2.5">
				<Checkbox
					className="mt-0.5"
					checked={value.claimsTravel}
					onCheckedChange={(c) => onChange({ ...value, claimsTravel: !!c })}
				/>
				<span className="flex flex-col gap-0.5">
					<span className="text-sm font-medium">Claim Provider Travel</span>
					<span className="text-foreground/50 text-xs">
						{hasDistance
							? "Home → Client → home, from the Client's stored distance"
							: "This Client has no stored distance - travel will be zero"}
					</span>
				</span>
			</label>

			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	);
}
