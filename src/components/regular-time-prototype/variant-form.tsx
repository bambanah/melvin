// PROTOTYPE - throwaway (#502). Variant B: Regular Time is part of the Client
// form. The Client page only reads it back; entering, editing and clearing all
// happen on /edit behind a "has a regular time" tick.
import { RegularTimeFields } from "./fields";
import {
	blankRegularTime,
	formatSpan,
	type RegularTime,
	useRegularTime,
	useSoloHourlyItems
} from "./store";
import { Fact } from "@/components/shared/fact";
import { Checkbox } from "@/components/ui/checkbox";
import Heading from "@/components/ui/heading";
import { CalendarClock } from "lucide-react";
import Link from "next/link";

/** Read-only fact for the Client page's FactGrid slot. */
export function VariantFormFact({ clientId }: { clientId: string }) {
	const regularTime = useRegularTime(clientId);
	const { items } = useSoloHourlyItems();

	return (
		<Fact icon={CalendarClock} label="Regular time">
			{regularTime ? (
				<span className="flex flex-col">
					<span>{formatSpan(regularTime)}</span>
					<span className="text-foreground/50 text-xs">
						{items.find((i) => i.id === regularTime.supportItemId)?.description}
						{regularTime.claimsTravel ? " · travel" : " · no travel"}
					</span>
				</span>
			) : (
				<Link
					href={`/dashboard/clients/${clientId}/edit?variant=B`}
					className="text-foreground/50 decoration-foreground/30 hover:decoration-foreground underline underline-offset-4"
				>
					Not set
				</Link>
			)}
		</Fact>
	);
}

/** Section mounted inside ClientForm; the form commits it on submit. */
export function VariantFormFields({
	value,
	onChange,
	hasDistance,
	showErrors
}: {
	value: RegularTime | null;
	onChange: (value: RegularTime | null) => void;
	hasDistance: boolean;
	showErrors: boolean;
}) {
	const { defaultId } = useSoloHourlyItems();

	return (
		<div className="flex flex-col gap-4 border-t pt-6">
			<Heading size="xsmall">Regular Time</Heading>
			<label className="flex items-center gap-2.5">
				<Checkbox
					checked={!!value}
					onCheckedChange={(c) =>
						onChange(c ? blankRegularTime(defaultId) : null)
					}
				/>
				<span className="text-sm">
					This Client gets the same work every time
				</span>
			</label>
			{value && (
				<RegularTimeFields
					value={value}
					onChange={onChange}
					hasDistance={hasDistance}
					showErrors={showErrors}
				/>
			)}
		</div>
	);
}
