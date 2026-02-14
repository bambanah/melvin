import { FormSelect, FormSelectProps } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

interface ClientSelectProps extends Omit<
	FormSelectProps,
	"placeholder" | "options"
> {
	excludeClientId?: string;
}

function ClientSelect({ excludeClientId, ...props }: ClientSelectProps) {
	const { data: { clients } = {} } = trpc.clients.list.useQuery({});

	const options = useMemo(
		() =>
			clients
				?.filter((client) => client.id !== excludeClientId)
				.map((client) => ({
					label: client.name,
					value: client.id
				})) ?? [],
		[clients, excludeClientId]
	);

	return (
		<FormSelect options={options} placeholder="Select a client..." {...props} />
	);
}

export default ClientSelect;
