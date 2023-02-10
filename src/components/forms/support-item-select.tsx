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
	const { data: { supportItems } = {}, error } = trpc.supportItem.list.useQuery(
		{}
	);

	let options = [];

	if (error) {
		options = [{ label: "An error occured", value: "" }];
	}

	options = supportItems
		? supportItems.map((supportItem) => ({
				label: supportItem.description,
				value: supportItem.id,
		  }))
		: [{ label: "Loading...", value: "" }];

	return <Select options={options} name={name} control={control} />;
};

export default SupportItemSelect;
