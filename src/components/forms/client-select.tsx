import { FormSelect, FormSelectProps } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { FieldValues } from "react-hook-form";

function ClientSelect<T extends FieldValues>({
	excludeClientId,
	...props
}: { excludeClientId?: string } & Omit<
	FormSelectProps<T>,
	"placeholder" | "options"
>) {
	const [options, setOptions] = useState<{ label: string; value: string }[]>(
		[]
	);
	const { data: { clients } = {} } = trpc.clients.list.useQuery({});

	useEffect(() => {
		if (clients) {
			setOptions(
				clients
					.filter((client) => client.id !== excludeClientId)
					.map((client) => ({
						label: client.name,
						value: client.id,
					}))
			);
		}
	}, [clients, excludeClientId]);

	return (
		<FormSelect options={options} placeholder="Select a client..." {...props} />
	);
}

export default ClientSelect;
