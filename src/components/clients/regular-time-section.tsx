import { DetailSection } from "@/components/shared/detail-page";
import { Fact, FactList } from "@/components/shared/fact";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/select";
import { formatTimeSpan, utcDate } from "@/lib/date-utils";
import { trpc } from "@/lib/trpc";
import {
	regularTimeSchema,
	type RegularTimeSchema
} from "@/schema/regular-time-schema";
import type { ClientByIdOutput } from "@/server/api/routers/client-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarClock, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

type RegularTime = NonNullable<ClientByIdOutput["regularTime"]>;

export function RegularTimeSection({ client }: { client: ClientByIdOutput }) {
	const [editing, setEditing] = useState(false);
	const trpcUtils = trpc.useUtils();
	const clearMutation = trpc.regularTime.clear.useMutation();
	const { regularTime } = client;

	const clear = () =>
		clearMutation.mutateAsync({ clientId: client.id }).then(() => {
			trpcUtils.clients.byId.invalidate({ id: client.id });
			trpcUtils.regularTime.list.invalidate();
			toast.success("Regular time cleared");
		});

	return (
		<DetailSection
			title="Regular time"
			caption="Applied to chosen dates to create Activities in one step"
		>
			{editing ? (
				<RegularTimeEditor client={client} onDone={() => setEditing(false)} />
			) : regularTime ? (
				<div className="flex items-start justify-between gap-2 pr-3">
					<FactList>
						<Fact label="Time">
							{formatTimeSpan(regularTime.startTime, regularTime.endTime)}
						</Fact>
						<Fact label="Support Item">
							{regularTime.supportItem.description}
						</Fact>
						<Fact label="Provider Travel">
							{regularTime.claimsTravel ? "Claimed" : "Not claimed"}
						</Fact>
					</FactList>
					<div className="flex shrink-0 gap-1 py-3">
						<Button
							variant="ghost"
							size="icon"
							aria-label="Edit regular time"
							onClick={() => setEditing(true)}
						>
							<Pencil />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Clear regular time"
							disabled={clearMutation.isPending}
							onClick={clear}
						>
							<X />
						</Button>
					</div>
				</div>
			) : (
				<div className="flex flex-col items-start gap-2 px-5 py-4">
					<p className="text-foreground/50 text-sm">
						No regular time. Set one if this Client gets the same work every
						time.
					</p>
					<Button size="sm" variant="outline" onClick={() => setEditing(true)}>
						<CalendarClock className="mr-2 h-4 w-4" />
						Set regular time
					</Button>
				</div>
			)}
		</DetailSection>
	);
}

const toHHmm = (time: Date) => format(utcDate(time), "HH:mm");

function editorDefaults(
	regularTime: RegularTime | null,
	defaultSupportItemId: string
): RegularTimeSchema {
	return regularTime
		? {
				startTime: toHHmm(regularTime.startTime),
				endTime: toHHmm(regularTime.endTime),
				supportItemId: regularTime.supportItem.id,
				claimsTravel: regularTime.claimsTravel
			}
		: {
				startTime: "",
				endTime: "",
				supportItemId: defaultSupportItemId,
				claimsTravel: false
			};
}

function RegularTimeEditor({
	client,
	onDone
}: {
	client: ClientByIdOutput;
	onDone: () => void;
}) {
	const trpcUtils = trpc.useUtils();
	const setMutation = trpc.regularTime.set.useMutation();
	const { data: user } = trpc.user.fetch.useQuery();
	const { data: { supportItems } = {} } = trpc.supportItem.list.useQuery({});

	const soloHourlyItems = (supportItems ?? []).filter(
		(item) => item.rateType === "HOUR" && !item.isGroup
	);
	const defaultSupportItemId =
		soloHourlyItems.find((item) => item.id === user?.defaultSupportItemId)
			?.id ?? "";

	const form = useForm<RegularTimeSchema>({
		resolver: zodResolver(regularTimeSchema),
		values: editorDefaults(client.regularTime, defaultSupportItemId),
		resetOptions: { keepDirtyValues: true }
	});

	const onSubmit = (regularTime: RegularTimeSchema) =>
		setMutation
			.mutateAsync({ clientId: client.id, regularTime })
			.then(() => {
				trpcUtils.clients.byId.invalidate({ id: client.id });
				trpcUtils.regularTime.list.invalidate();
				toast.success("Regular time saved");
				onDone();
			})
			.catch((error) => {
				toast.error(
					error instanceof Error ? error.message : "Failed to save regular time"
				);
			});

	const hasDistance = client.distanceToClient != null;

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col gap-4 px-5 py-4"
			>
				<div className="grid grid-cols-2 gap-3">
					<FormField
						name="startTime"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Start</FormLabel>
								<FormControl>
									<Input type="time" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="endTime"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormLabel>End</FormLabel>
								<FormControl>
									<Input type="time" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					name="supportItemId"
					control={form.control}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Support Item</FormLabel>
							<FormSelect
								options={soloHourlyItems.map((item) => ({
									label: item.description,
									value: item.id
								}))}
								placeholder="Pick a solo hourly item"
								value={field.value}
								onValueChange={field.onChange}
							/>
							<FormDescription>Solo, hourly items only</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					name="claimsTravel"
					control={form.control}
					render={({ field }) => (
						<FormItem className="flex flex-row items-start space-y-0 space-x-2.5">
							<FormControl>
								<Checkbox
									className="mt-0.5"
									checked={field.value}
									onCheckedChange={(checked) => field.onChange(!!checked)}
								/>
							</FormControl>
							<div className="flex flex-col gap-0.5">
								<FormLabel className="cursor-pointer">
									Claim Provider Travel
								</FormLabel>
								<FormDescription>
									{hasDistance
										? "Home → Client → home, from the Client's stored distance"
										: "This Client has no stored distance - travel will be zero"}
								</FormDescription>
							</div>
						</FormItem>
					)}
				/>

				<div className="flex gap-2">
					<Button type="submit" size="sm" disabled={setMutation.isPending}>
						Save
					</Button>
					<Button type="button" size="sm" variant="ghost" onClick={onDone}>
						Cancel
					</Button>
				</div>
			</form>
		</Form>
	);
}
