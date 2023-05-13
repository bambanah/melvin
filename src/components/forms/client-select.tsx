import Select from "@components/forms/select";
import { trpc } from "@utils/trpc";
import { FieldValues, UseControllerProps } from "react-hook-form";

function ClientSelect<T extends FieldValues>(props: UseControllerProps<T>) {
	const { data: { clients } = {} } = trpc.clients.list.useQuery({});

	if (!clients) {
		return <Select options={[{ label: "Loading...", value: "" }]} {...props} />;
	}

	const options = clients.map((client) => ({
		label: client.name,
		value: client.id,
	}));

	return <Select options={options} {...props} />;
}

export default ClientSelect;
