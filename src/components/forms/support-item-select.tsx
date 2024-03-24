import { FormSelect } from "@/components/ui/select";
import { faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SupportItemListOutput } from "@/server/api/routers/support-item-router";
import { trpc } from "@/lib/trpc";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Control, FieldValues, Path } from "react-hook-form";

interface Props<T extends FieldValues> {
	name: Path<T>;
	control: Control<T>;
	setSupportItems?: Dispatch<
		SetStateAction<SupportItemListOutput[] | undefined>
	>;
}

const SupportItemSelect = <T extends FieldValues>({
	setSupportItems,
	...props
}: Props<T>) => {
	const [options, setOptions] = useState<
		{ label: JSX.Element; value: string }[]
	>([]);
	const { data: { supportItems } = {} } = trpc.supportItem.list.useQuery({});

	useEffect(() => {
		if (supportItems) {
			setSupportItems && setSupportItems(supportItems);

			setOptions(
				supportItems.map((supportItem) => ({
					label: (
						<span className="flex items-center gap-2">
							{supportItem.description}
							{supportItem.isGroup ? (
								<FontAwesomeIcon
									icon={faUserGroup}
									size="xs"
									className="text-zinc-600"
								/>
							) : (
								""
							)}
						</span>
					),
					value: supportItem.id,
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
