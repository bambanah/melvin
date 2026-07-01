import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

const RECENT_CLIENTS_KEY = "melvin:recent-clients";
const MAX_RECENT_CLIENTS = 5;

interface ClientQuickSelectProps {
	value?: string;
	onChange?: (clientId: string) => void;
	className?: string;
	excludeClientId?: string;
}

function getRecentClientIds(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const stored = localStorage.getItem(RECENT_CLIENTS_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

function addRecentClient(clientId: string): void {
	if (typeof window === "undefined") return;
	try {
		const recent = getRecentClientIds().filter((id) => id !== clientId);
		recent.unshift(clientId);
		localStorage.setItem(
			RECENT_CLIENTS_KEY,
			JSON.stringify(recent.slice(0, MAX_RECENT_CLIENTS))
		);
	} catch {
		// Ignore storage errors
	}
}

export function ClientQuickSelect({
	value,
	onChange,
	className,
	excludeClientId
}: ClientQuickSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const [recentIds, setRecentIds] = React.useState<string[]>([]);

	React.useEffect(() => {
		setRecentIds(getRecentClientIds());
	}, []);

	const { data: { clients } = {} } = trpc.clients.list.useQuery({});

	const selectedClient = clients?.find((c) => c.id === value);

	const availableClients = React.useMemo(() => {
		return clients?.filter((c) => c.id !== excludeClientId) ?? [];
	}, [clients, excludeClientId]);

	const filteredClients = React.useMemo(() => {
		if (!search.trim()) return availableClients;
		const lower = search.toLowerCase();
		return availableClients.filter((c) => c.name.toLowerCase().includes(lower));
	}, [availableClients, search]);

	const recentClients = React.useMemo(() => {
		const recentFromIds = recentIds
			.map((id) => filteredClients.find((c) => c.id === id))
			.filter((c): c is (typeof filteredClients)[number] => c !== undefined)
			.slice(0, 4);
		return recentFromIds;
	}, [recentIds, filteredClients]);

	const otherClients = React.useMemo(() => {
		const recentIdSet = new Set(recentClients.map((c) => c.id));
		return filteredClients.filter((c) => !recentIdSet.has(c.id));
	}, [filteredClients, recentClients]);

	const handleSelect = (clientId: string) => {
		onChange?.(clientId);
		addRecentClient(clientId);
		setRecentIds(getRecentClientIds());
		setOpen(false);
		setSearch("");
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange?.("");
		setSearch("");
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"w-full justify-between font-normal",
						!value && "text-muted-foreground",
						className
					)}
					data-testid="client-search-input"
				>
					{selectedClient?.name ?? "Select client..."}
					<div className="flex items-center gap-1">
						{value && (
							<X
								className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
								onClick={handleClear}
							/>
						)}
						<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
					</div>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<div className="p-2">
					<Input
						placeholder="Search clients..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-8"
					/>
				</div>
				<div className="max-h-60 overflow-y-auto">
					{filteredClients.length === 0 ? (
						<div className="text-muted-foreground py-6 text-center text-sm">
							No clients found
						</div>
					) : (
						<>
							{recentClients.length > 0 && (
								<div>
									<div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
										Recent
									</div>
									{recentClients.map((client) => (
										<button
											key={client.id}
											type="button"
											className={cn(
												"hover:bg-accent relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none",
												value === client.id && "bg-accent"
											)}
											onClick={() => handleSelect(client.id)}
										>
											{value === client.id && (
												<Check className="absolute left-2 h-4 w-4" />
											)}
											{client.name}
										</button>
									))}
								</div>
							)}
							{recentClients.length > 0 && otherClients.length > 0 && (
								<div className="bg-border mx-2 my-1 h-px" />
							)}
							{otherClients.length > 0 && (
								<div>
									{recentClients.length > 0 && (
										<div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
											All Clients
										</div>
									)}
									{otherClients.map((client) => (
										<button
											key={client.id}
											type="button"
											className={cn(
												"hover:bg-accent relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none",
												value === client.id && "bg-accent"
											)}
											onClick={() => handleSelect(client.id)}
										>
											{value === client.id && (
												<Check className="absolute left-2 h-4 w-4" />
											)}
											{client.name}
										</button>
									))}
								</div>
							)}
						</>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
