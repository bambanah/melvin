import Select from "@components/forms/select";
import { trpc } from "@utils/trpc";
import { FieldValues, UseControllerProps } from "react-hook-form";

function ClientSelect<T extends FieldValues>(props: UseControllerProps<T>) {
	const { data: { clients } = {}, error } = trpc.clients.list.useQuery({});

	let options = [];

	if (error) {
		options = [{ label: "An error occured", value: "" }];
	}

	options = clients
		? clients.map((client) => ({
				label: client.name,
				value: client.id,
		  }))
		: [{ label: "Loading...", value: "" }];

	return <Select options={options} {...props} />;
}

export default ClientSelect;
