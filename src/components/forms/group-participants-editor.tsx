import { Button } from "@/components/ui/button";
import {
	appendParticipant,
	removeParticipantAt,
	setParticipantAt
} from "@/lib/group-participants";
import { MAX_ADDITIONAL_GROUP_PARTICIPANTS } from "@/schema/invoice-schema";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The "other participants" list for a group activity: a capped list of client
 * selects with per-row remove, an add-participant affordance, and an optional
 * error message. The add / update / remove transforms come from
 * `@/lib/group-participants`, so both the quick-entry multi-activity form and
 * the invoice creation form drive the same list logic and honour the same cap.
 *
 * The client picker itself differs between hosts (quick-select popover vs.
 * dropdown), so it is supplied via `renderClientSelect` — this component owns
 * the structure and exclusion wiring, the host owns the widget.
 */

interface RenderClientSelectArgs {
	value: string;
	onChange: (clientId: string) => void;
	/** The primary client, never selectable as an "other" participant. */
	excludeClientId?: string;
	/** The other participant slots, so a client can't be picked twice. */
	excludeClientIds: string[];
}

interface GroupParticipantsEditorProps {
	value: string[];
	onChange: (ids: string[]) => void;
	excludeClientId?: string;
	error?: string;
	renderClientSelect: (args: RenderClientSelectArgs) => ReactNode;
}

export function GroupParticipantsEditor({
	value,
	onChange,
	excludeClientId,
	error,
	renderClientSelect
}: GroupParticipantsEditorProps) {
	return (
		<div className="flex flex-col gap-2">
			{value.map((clientId, index) => (
				<div key={index} className="flex items-center gap-2">
					<div className="flex-1">
						{renderClientSelect({
							value: clientId,
							onChange: (nextId) =>
								onChange(setParticipantAt(value, index, nextId)),
							excludeClientId,
							excludeClientIds: value.filter((_, i) => i !== index)
						})}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => onChange(removeParticipantAt(value, index))}
						className="text-destructive hover:text-destructive h-8 w-8 p-0"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			))}

			{value.length < MAX_ADDITIONAL_GROUP_PARTICIPANTS && (
				<button
					type="button"
					onClick={() => onChange(appendParticipant(value))}
					className="text-muted-foreground hover:text-foreground mt-1 text-left text-sm underline-offset-4 hover:underline"
				>
					+ add participant
				</button>
			)}

			{error && <p className="text-destructive mt-1 text-sm">{error}</p>}
		</div>
	);
}

export default GroupParticipantsEditor;
