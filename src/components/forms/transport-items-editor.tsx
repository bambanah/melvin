import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActivityTransportItemSchema } from "@/schema/activity-schema";
import { Trash2 } from "lucide-react";

/**
 * The parking / tolls / other editor for an activity's non-distance transport
 * items. Owns the add / update / remove list transforms so every activity form
 * that lets the worker attach out-of-pocket transport costs shares one control.
 *
 * Fully controlled: the caller holds the `ActivityTransportItemSchema[]` (RHF
 * field value or manual state) and receives a fresh array on every change.
 * Distance (km) is handled separately by `SummingDistanceInput`; this editor
 * only manages PARKING / TOLL / OTHER rows.
 */

interface TransportItemsEditorProps {
	value: ActivityTransportItemSchema[];
	onChange: (items: ActivityTransportItemSchema[]) => void;
}

export function TransportItemsEditor({
	value,
	onChange
}: TransportItemsEditorProps) {
	const addItem = () =>
		onChange([...value, { type: "PARKING", amount: 0, note: "" }]);

	const updateItem = (
		index: number,
		updates: Partial<ActivityTransportItemSchema>
	) =>
		onChange(
			value.map((item, i) => (i === index ? { ...item, ...updates } : item))
		);

	const removeItem = (index: number) =>
		onChange(value.filter((_, i) => i !== index));

	return (
		<>
			{value.length > 0 && (
				<div className="flex flex-col gap-2">
					{value.map((item, idx) => (
						<div key={idx} className="flex items-center gap-2">
							<select
								value={item.type}
								onChange={(e) =>
									updateItem(idx, {
										type: e.target.value as ActivityTransportItemSchema["type"]
									})
								}
								className="border-input bg-background h-10 rounded-md border px-3 text-sm"
							>
								<option value="PARKING">Parking</option>
								<option value="TOLL">Toll</option>
								<option value="OTHER">Other</option>
							</select>
							<div className="relative flex-1">
								<span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
									$
								</span>
								<Input
									type="number"
									step="0.01"
									min="0"
									value={item.amount || ""}
									onChange={(e) =>
										updateItem(idx, {
											amount: parseFloat(e.target.value) || 0
										})
									}
									className="pl-7"
									placeholder="0.00"
								/>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => removeItem(idx)}
								className="text-destructive hover:text-destructive h-8 w-8 p-0"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
				</div>
			)}

			<button
				type="button"
				onClick={addItem}
				className="text-muted-foreground hover:text-foreground text-left text-sm underline-offset-4 hover:underline"
			>
				+ parking / tolls
			</button>
		</>
	);
}

export default TransportItemsEditor;
