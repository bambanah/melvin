import Select from "@components/forms/select";
import { trpc } from "@utils/trpc";
import React from "react";

interface Props {
	name: string;
	error?: boolean;
}

const SupportItemSelect = ({ name, error: formError }: Props) => {
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

	return <Select name={name} error={formError} options={options} />;
};

export default SupportItemSelect;
