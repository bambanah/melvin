// PROTOTYPE - throwaway (#502). The set-up verdict (variant A of the first
// prototype): a "Regular time" section on the Client page that flips between a
// read view and an inline edit view in place. Hosts apply variant A's button.
import { useApplyVariant } from "./apply-store";
import { ApplyDialogButton } from "./variant-a-dialog";
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
import { DetailSection } from "@/components/shared/detail-page";
import { Fact, FactList } from "@/components/shared/fact";
import { Button } from "@/components/ui/button";
import { CalendarClock, Pencil, X } from "lucide-react";
import { useState } from "react";

export function SetupSection({
	clientId,
	clientName,
	hasDistance
}: {
	clientId: string;
	clientName: string;
	hasDistance: boolean;
}) {
	const variant = useApplyVariant();
	const regularTime = useRegularTime(clientId);
	const { items, defaultId } = useSoloHourlyItems();
	const [draft, setDraft] = useState<RegularTime | null>(null);
	const [tried, setTried] = useState(false);

	const save = () => {
		if (!draft) return;
		setTried(true);
		if (validate(draft)) return;
		setRegularTime(clientId, draft);
		setDraft(null);
		setTried(false);
	};

	return (
		<DetailSection
			title="Regular time"
			caption="Applied to chosen dates to create Activities in one step"
		>
			{draft ? (
				<div className="flex flex-col gap-4 px-5 py-4">
					<RegularTimeFields
						value={draft}
						onChange={setDraft}
						hasDistance={hasDistance}
						showErrors={tried}
					/>
					<div className="flex gap-2">
						<Button size="sm" onClick={save}>
							Save
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => {
								setDraft(null);
								setTried(false);
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			) : regularTime ? (
				<div>
					<div className="flex items-start justify-between gap-2 pr-3">
						<FactList>
							<Fact label="Time">{formatSpan(regularTime)}</Fact>
							<Fact label="Support Item">
								{items.find((i) => i.id === regularTime.supportItemId)
									?.description ?? "-"}
							</Fact>
							<Fact label="Provider Travel">
								{regularTime.claimsTravel ? "Claimed" : "Not claimed"}
							</Fact>
						</FactList>
						<div className="flex shrink-0 gap-1 py-3">
							<Button
								variant="ghost"
								size="icon"
								aria-label="Edit regular time"
								onClick={() => setDraft(regularTime)}
							>
								<Pencil />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Clear regular time"
								onClick={() => setRegularTime(clientId, null)}
							>
								<X />
							</Button>
						</div>
					</div>
					{variant === "A" && (
						<div className="px-5 pb-4">
							<ApplyDialogButton
								clientId={clientId}
								clientName={clientName}
								regularTime={regularTime}
							/>
						</div>
					)}
				</div>
			) : (
				<div className="flex flex-col items-start gap-2 px-5 py-4">
					<p className="text-foreground/50 text-sm">
						No regular time. Set one if this Client gets the same work every
						time.
					</p>
					<Button
						size="sm"
						variant="outline"
						onClick={() => setDraft(blankRegularTime(defaultId))}
					>
						<CalendarClock className="mr-2 h-4 w-4" />
						Set regular time
					</Button>
				</div>
			)}
		</DetailSection>
	);
}
