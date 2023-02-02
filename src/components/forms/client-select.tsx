import Select from "@components/forms/select";
import { trpc } from "@utils/trpc";

interface Props {
	name: string;
	error?: boolean;
}

const ClientSelect = ({ name, error: formError }: Props) => {
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

	return <Select name={name} error={formError} options={options} />;
};

export default ClientSelect;
