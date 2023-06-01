import Select from "@components/forms/select";
import { SupportItemListOutput } from "@server/api/routers/support-item-router";
import { trpc } from "@utils/trpc";
import { Dispatch, SetStateAction } from "react";
import { Control, FieldValues, Path } from "react-hook-form";

interface Props<T extends FieldValues> {
	name: Path<T>;
	control: Control<T>;
	setSupportItems?: Dispatch<
		SetStateAction<SupportItemListOutput[] | undefined>
	>;
}

const SupportItemSelect = <T extends FieldValues>({
	name,
	control,
	setSupportItems,
}: Props<T>) => {
	const { data: { supportItems } = {} } = trpc.supportItem.list.useQuery({});

	if (!supportItems) {
		return (
			<Select
				options={[{ label: "Loading...", value: "" }]}
				name={name}
				control={control}
			/>
		);
	}

	setSupportItems && setSupportItems(supportItems);

	const options = supportItems.map((supportItem) => ({
		label: supportItem.description,
		value: supportItem.id,
	}));

	return <Select options={options} name={name} control={control} />;
};

export default SupportItemSelect;
