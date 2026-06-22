import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Check, X } from "lucide-react";
import * as React from "react";

const RECENT_CLIENTS_KEY = "melvin:recent-clients";
const MAX_RECENT_CLIENTS = 5;

interface ClientQuickSelectProps {
	value?: string;
	onChange?: (clientId: string) => void;
	className?: string;
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
	className
}: ClientQuickSelectProps) {
	const [search, setSearch] = React.useState("");
	const [recentIds, setRecentIds] = React.useState<string[]>([]);

	React.useEffect(() => {
		setRecentIds(getRecentClientIds());
	}, []);

	const { data: { clients } = {} } = trpc.clients.list.useQuery({});

	const selectedClient = clients?.find((c) => c.id === value);
	const recentClients = React.useMemo(() => {
		if (!clients) return [];
		return recentIds
			.map((id) => clients.find((c) => c.id === id))
			.filter((c): c is (typeof clients)[number] => c !== undefined)
			.slice(0, 4);
	}, [recentIds, clients]);

	const filteredClients = React.useMemo(() => {
		if (!search.trim()) return [];
		const lower = search.toLowerCase();
		return (
			clients
				?.filter((c) => c.name.toLowerCase().includes(lower))
				.slice(0, 5) ?? []
		);
	}, [clients, search]);

	const handleSelect = (clientId: string) => {
		onChange?.(clientId);
		addRecentClient(clientId);
		setRecentIds(getRecentClientIds());
		setSearch("");
	};

	const handleClear = () => {
		onChange?.("");
		setSearch("");
	};

	if (selectedClient) {
		return (
			<div className={cn("flex items-center gap-2", className)}>
				<Badge variant="secondary" className="py-1.5 pr-1 pl-3 text-sm">
					{selectedClient.name}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="ml-1 h-5 w-5 p-0"
						onClick={handleClear}
					>
						<X className="h-3 w-3" />
					</Button>
				</Badge>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{recentClients.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{recentClients.map((client) => (
						<Badge
							key={client.id}
							variant="outline"
							className="hover:bg-accent cursor-pointer transition-colors"
							onClick={() => handleSelect(client.id)}
						>
							{client.name}
						</Badge>
					))}
				</div>
			)}

			<div className="relative">
				<Input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search clients..."
					className="w-full"
					data-testid="client-search-input"
				/>

				{filteredClients.length > 0 && (
					<div className="bg-popover absolute top-full right-0 left-0 z-10 mt-1 rounded-md border shadow-md">
						{filteredClients.map((client) => (
							<button
								key={client.id}
								type="button"
								className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
								onClick={() => handleSelect(client.id)}
							>
								{client.name}
								{client.id === value && (
									<Check className="text-primary ml-auto h-4 w-4" />
								)}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
