import { FormSelect, FormSelectProps } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

interface ClientSelectProps extends Omit<
	FormSelectProps,
	"placeholder" | "options"
> {
	excludeClientId?: string;
	excludeClientIds?: string[];
}

function ClientSelect({
	excludeClientId,
	excludeClientIds,
	...props
}: ClientSelectProps) {
	const { data: { clients } = {} } = trpc.clients.list.useQuery({});

	const options = useMemo(() => {
		const excluded = new Set([excludeClientId, ...(excludeClientIds ?? [])]);

		return (
			clients
				?.filter((client) => !excluded.has(client.id))
				.map((client) => ({
					label: client.name,
					value: client.id
				})) ?? []
		);
	}, [clients, excludeClientId, excludeClientIds]);

	return (
		<FormSelect options={options} placeholder="Select a client..." {...props} />
	);
}

export default ClientSelect;
