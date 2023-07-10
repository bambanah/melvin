import Select from "@components/forms/select";
import { trpc } from "@utils/trpc";
import { useEffect, useState } from "react";
import { FieldValues, UseControllerProps } from "react-hook-form";

function ClientSelect<T extends FieldValues>(props: UseControllerProps<T>) {
	const [options, setOptions] = useState<{ label: string; value: string }[]>(
		[]
	);
	const { data: { clients } = {} } = trpc.clients.list.useQuery({});

	useEffect(() => {
		if (clients) {
			setOptions(
				clients.map((client) => ({
					label: client.name,
					value: client.id,
				}))
			);
		}
	}, [clients]);

	return <Select options={options} {...props} />;
}

export default ClientSelect;
