import Select from "@components/forms/select";
import { trpc } from "@utils/trpc";
import { Control, FieldValues, Path } from "react-hook-form";

interface Props<T extends FieldValues> {
	name: Path<T>;
	control: Control<T>;
}

const SupportItemSelect = <T extends FieldValues>({
	name,
	control,
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

	const options = supportItems.map((supportItem) => ({
		label: supportItem.description,
		value: supportItem.id,
	}));

	return <Select options={options} name={name} control={control} />;
};

export default SupportItemSelect;
