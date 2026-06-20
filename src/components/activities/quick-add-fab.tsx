import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { MultiActivityForm } from "./multi-activity-form";

export function QuickAddFab() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				onClick={() => setOpen(true)}
				className="bg-primary hover:bg-primary/90 fixed right-4 bottom-4 z-50 h-14 w-14 rounded-full shadow-lg md:hidden"
				size="icon"
			>
				<Plus className="h-6 w-6" />
				<span className="sr-only">Add Activity</span>
			</Button>

			<MultiActivityForm date={new Date()} open={open} onOpenChange={setOpen} />
		</>
	);
}

export default QuickAddFab;
