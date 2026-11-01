// PROTOTYPE - throwaway (#502). Variant C: Regular Time takes the header's one
// primary action slot and its eyebrow. The button opens a dialog (drawer on
// phones) holding set, edit and clear; the eyebrow reads it back.
import { RegularTimeFields } from "./fields";
import {
	blankRegularTime,
	formatSpan,
	type RegularTime,
	setRegularTime,
	useRegularTime,
	useSoloHourlyItems,
	validate
} from "./store";
import { Button } from "@/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle
} from "@/components/ui/responsive-dialog";
import { CalendarClock } from "lucide-react";
import { useState } from "react";

export function VariantDialogEyebrow({ clientId }: { clientId: string }) {
	const regularTime = useRegularTime(clientId);
	const { items } = useSoloHourlyItems();
	if (!regularTime) return null;

	return (
		<>
			Regular {formatSpan(regularTime)} ·{" "}
			{items.find((i) => i.id === regularTime.supportItemId)?.description} ·{" "}
			{regularTime.claimsTravel ? "with travel" : "no travel"}
		</>
	);
}

export function VariantDialogAction({
	clientId,
	clientName,
	hasDistance
}: {
	clientId: string;
	clientName: string;
	hasDistance: boolean;
}) {
	const regularTime = useRegularTime(clientId);
	const { defaultId } = useSoloHourlyItems();
	const [draft, setDraft] = useState<RegularTime | null>(null);
	const [tried, setTried] = useState(false);

	const close = () => {
		setDraft(null);
		setTried(false);
	};
	const save = () => {
		if (!draft) return;
		setTried(true);
		if (validate(draft)) return;
		setRegularTime(clientId, draft);
		close();
	};

	return (
		<>
			<Button
				size="sm"
				variant={regularTime ? "outline" : "default"}
				onClick={() => setDraft(regularTime ?? blankRegularTime(defaultId))}
			>
				<CalendarClock className="mr-2 h-4 w-4" />
				{regularTime ? "Regular time" : "Set regular time"}
			</Button>

			<ResponsiveDialog open={!!draft} onOpenChange={(o) => !o && close()}>
				<ResponsiveDialogContent>
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle>Regular time</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							The work {clientName} gets every time. Pick dates later to create
							the Activities.
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>
					<div className="px-4 md:px-0">
						{draft && (
							<RegularTimeFields
								value={draft}
								onChange={setDraft}
								hasDistance={hasDistance}
								showErrors={tried}
							/>
						)}
					</div>
					<ResponsiveDialogFooter>
						{regularTime && (
							<Button
								variant="ghost"
								className="text-destructive md:mr-auto"
								onClick={() => {
									setRegularTime(clientId, null);
									close();
								}}
							>
								Clear
							</Button>
						)}
						<Button onClick={save}>Save</Button>
					</ResponsiveDialogFooter>
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		</>
	);
}
