import { FormSelect, FormSelectProps } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { SupportItemListOutput } from "@/server/api/routers/support-item-router";
import { Users } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState, type JSX } from "react";

interface SupportItemSelectProps
	extends Omit<FormSelectProps, "placeholder" | "options"> {
	setSupportItems?: Dispatch<
		SetStateAction<SupportItemListOutput[] | undefined>
	>;
}

const SupportItemSelect = ({
	setSupportItems,
	...props
}: SupportItemSelectProps) => {
	const [options, setOptions] = useState<
		{ label: JSX.Element; value: string }[]
	>([]);
	const { data: { supportItems } = {} } = trpc.supportItem.list.useQuery({});

	useEffect(() => {
		if (supportItems) {
			if (setSupportItems) setSupportItems(supportItems);

			setOptions(
				supportItems.map((supportItem) => ({
					label: (
						<span className="flex items-center gap-2">
							{supportItem.isGroup && (
								<Users className="text-foreground/80 h-4 w-4" />
							)}
							{supportItem.description}
						</span>
					),
					value: supportItem.id
				}))
			);
		}
	}, [setSupportItems, supportItems]);

	return (
		<FormSelect
			options={options}
			placeholder="Select a support item..."
			{...props}
		/>
	);
};

export default SupportItemSelect;
