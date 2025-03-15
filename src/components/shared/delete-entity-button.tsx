import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { Trash } from "lucide-react";
import { toast } from "react-toastify";

export const DeleteEntityButton = ({
	entityId,
	entityType = "clients"
}: {
	entityId: string;
	entityType: "clients" | "invoice";
}) => {
	const trpcUtils = trpc.useUtils();
	const deleteMutation = trpc[entityType].delete.useMutation();

	const deleteClient = () => {
		if (confirm("Are you sure?")) {
			deleteMutation
				.mutateAsync({ id: entityId })
				.then(() => {
					trpcUtils[entityType].list.invalidate();
				})
				.catch(() => {
					toast.error("An error occured. Please refresh and try again.");
				});
		}
	};

	return (
		<DropdownMenuItem onClick={() => deleteClient()} className="cursor-pointer">
			<Trash className="mr-2 h-4 w-4" />
			<span>Delete</span>
		</DropdownMenuItem>
	);
};
