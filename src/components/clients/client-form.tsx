import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/components/ui/form";
import Heading from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { ClientSchema } from "@/schema/client-schema";
import { clientSchema } from "@/schema/client-schema";
import { ClientByIdOutput } from "@/server/api/routers/client-router";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

interface Props {
	existingClient?: ClientByIdOutput;
}

const ClientForm = ({ existingClient }: Props) => {
	const formPurpose = existingClient ? "update" : "create";

	const router = useRouter();

	const trpcUtils = trpc.useUtils();
	const updateClientMutation = trpc.clients.update.useMutation();
	const createClientMutation = trpc.clients.create.useMutation();

	const form = useForm<ClientSchema>({
		resolver: zodResolver(clientSchema),
		defaultValues: {
			name: existingClient?.name ?? "",
			number: existingClient?.number ?? "",
			billTo: existingClient?.billTo ?? "",
			invoiceNumberPrefix: existingClient?.invoiceNumberPrefix ?? "",
			defaultTransitDistance:
				existingClient?.defaultTransitDistance?.toString() ?? "",
			defaultTransitTime: existingClient?.defaultTransitTime?.toString() ?? "",
			invoiceEmail: existingClient?.invoiceEmail ?? ""
		}
	});

	const submitCallback = (successMessage: string) => {
		trpcUtils.clients.list.invalidate();
		toast.success(successMessage);

		router.back();
	};

	const onSubmit = (data: ClientSchema) => {
		if (existingClient?.id) {
			updateClientMutation
				.mutateAsync({
					id: existingClient.id,
					client: data
				})
				.then(() => submitCallback("Client updated"));
		} else {
			createClientMutation
				.mutateAsync({
					client: data
				})
				.then(() => submitCallback("Client created"));
		}
	};

	return (
		<div className="mb-8 flex max-w-xl flex-col items-center gap-8 self-center p-6">
			<Heading>
				{existingClient ? `Updating ${existingClient.name}` : "Add New Client"}
			</Heading>
			<p className="text-center">
				All fields except <b>Participant Name</b> can be modified directly on an
				Invoice.
			</p>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						name="name"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormLabel required>Participant Name</FormLabel>
								<FormControl>
									<Input placeholder="John Smith" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="number"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Participant Number</FormLabel>
								<FormControl>
									<Input placeholder="123456789" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="invoiceNumberPrefix"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Invoice Number Prefix</FormLabel>
								<FormControl>
									<Input placeholder="Smith-" {...field} />
								</FormControl>
								<FormDescription>
									Default prefix to use for invoice numbers
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="billTo"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Bill To</FormLabel>
								<FormControl>
									<Input placeholder="HELP Enterprises" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="defaultTransitDistance"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Default Transit Distance</FormLabel>
								<FormControl>
									<Input placeholder="123456789" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="defaultTransitTime"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Default Transit Time</FormLabel>
								<FormControl>
									<Input placeholder="123456789" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="invoiceEmail"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Invoice Email</FormLabel>
								<FormControl>
									<Input placeholder="invoices@client.com" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="mt-4 flex justify-center gap-4">
						<Button type="submit" disabled={form.formState.isSubmitting}>
							{formPurpose.charAt(0).toUpperCase() + formPurpose.slice(1)}
						</Button>
						<Button asChild type="button" variant="secondary">
							<Link href="/dashboard/clients">Cancel</Link>
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export default ClientForm;
