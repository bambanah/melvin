// PROTOTYPE - throwaway (#502). Variant D: no card, no form. One sentence under
// the header whose underlined words are each their own popover editor; every
// change saves straight away. Clearing is the × at the end of the sentence.
import {
	blankRegularTime,
	formatTime,
	type RegularTime,
	setRegularTime,
	useRegularTime,
	useSoloHourlyItems,
	validate
} from "./store";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarClock, X } from "lucide-react";
import { type ReactNode, useState } from "react";

function Token({
	label,
	empty,
	children
}: {
	label: ReactNode;
	empty?: boolean;
	children: ReactNode;
}) {
	return (
		<Popover>
			<PopoverTrigger
				className={cn(
					"decoration-primary/50 hover:decoration-primary cursor-pointer font-medium underline decoration-dashed underline-offset-4",
					empty && "text-foreground/40"
				)}
			>
				{label}
			</PopoverTrigger>
			<PopoverContent className="w-auto p-2">{children}</PopoverContent>
		</Popover>
	);
}

export function VariantSentence({
	clientId,
	hasDistance
}: {
	clientId: string;
	hasDistance: boolean;
}) {
	const saved = useRegularTime(clientId);
	const { items, defaultId } = useSoloHourlyItems();
	// A half-filled sentence lives here until it's valid enough to save.
	const [pending, setPending] = useState<RegularTime | null>(null);
	const value = pending ?? saved;

	const update = (next: RegularTime) => {
		if (validate(next)) {
			setPending(next);
		} else {
			setPending(null);
			setRegularTime(clientId, next);
		}
	};

	if (!value) {
		return (
			<button
				className="text-foreground/50 hover:text-foreground -mt-2 flex cursor-pointer items-center gap-2 self-start text-sm"
				onClick={() => setPending(blankRegularTime(defaultId))}
			>
				<CalendarClock className="h-4 w-4" />
				Add a regular time
			</button>
		);
	}

	const error = pending && validate(pending);

	return (
		<div className="-mt-2 flex flex-col gap-1">
			<p className="flex flex-wrap items-baseline gap-x-1.5 text-sm leading-7">
				<CalendarClock className="text-primary h-4 w-4 self-center" />
				Usually
				<Token
					empty={!value.startTime}
					label={value.startTime ? formatTime(value.startTime) : "start"}
				>
					<Input
						type="time"
						value={value.startTime}
						onChange={(e) => update({ ...value, startTime: e.target.value })}
					/>
				</Token>
				to
				<Token
					empty={!value.endTime}
					label={value.endTime ? formatTime(value.endTime) : "end"}
				>
					<Input
						type="time"
						value={value.endTime}
						onChange={(e) => update({ ...value, endTime: e.target.value })}
					/>
				</Token>
				as
				<Token
					empty={!value.supportItemId}
					label={
						items.find((i) => i.id === value.supportItemId)?.description ??
						"support item"
					}
				>
					<ul className="flex max-h-64 flex-col overflow-y-auto">
						{items.map((i) => (
							<li key={i.id}>
								<button
									className={cn(
										"hover:bg-accent w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm",
										i.id === value.supportItemId && "font-semibold"
									)}
									onClick={() => update({ ...value, supportItemId: i.id })}
								>
									{i.description}
								</button>
							</li>
						))}
					</ul>
				</Token>
				,
				<button
					className="decoration-primary/50 hover:decoration-primary cursor-pointer font-medium underline decoration-dashed underline-offset-4"
					title={
						hasDistance
							? "Home → Client → home, from the stored distance"
							: "No stored distance - travel would be zero"
					}
					onClick={() =>
						update({ ...value, claimsTravel: !value.claimsTravel })
					}
				>
					{value.claimsTravel ? "claiming travel" : "no travel"}
				</button>
				.
				<button
					aria-label="Clear regular time"
					className="text-foreground/40 hover:text-destructive cursor-pointer self-center"
					onClick={() => {
						setPending(null);
						setRegularTime(clientId, null);
					}}
				>
					<X className="h-4 w-4" />
				</button>
			</p>
			{error && <p className="text-destructive text-xs">{error} - not saved</p>}
		</div>
	);
}
