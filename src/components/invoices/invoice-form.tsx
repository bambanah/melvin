import ClientSelect from "@/components/forms/client-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import Heading from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { InvoiceSchema, invoiceSchema } from "@/schema/invoice-schema";
import { InvoiceByIdOutput } from "@/server/api/routers/invoice-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import InvoiceActivityCreationForm from "./invoice-activity-creation-form";
import UnassignedActivities from "./unnassigned-activities";

import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/utc"));
dayjs.extend(require("dayjs/plugin/localizedFormat"));
dayjs.extend(require("dayjs/plugin/customParseFormat"));

interface Props {
	onSubmit: (invoiceData: InvoiceSchema) => void;
	existingInvoice?: InvoiceByIdOutput;
}

const InvoiceForm = ({ existingInvoice, onSubmit }: Props) => {
	const router = useRouter();

	const form = useForm<InvoiceSchema>({
		resolver: zodResolver(invoiceSchema),
		defaultValues: {
			...existingInvoice,
			clientId: existingInvoice?.clientId ?? "",
			date: existingInvoice?.date
				? dayjs.utc(existingInvoice?.date, "YYYY-MM-DD").toDate()
				: new Date(),
			invoiceNo: existingInvoice?.invoiceNo ?? "",
			billTo: existingInvoice?.billTo ?? "",
			activityIds: existingInvoice?.activities.map((a) => a.id) ?? [],
		},
	});

	const clientId = form.watch("clientId");
	const { data: billTo, refetch: refetchBillTo } =
		trpc.clients.getBillTo.useQuery(
			{
				id: clientId,
			},
			{ enabled: false }
		);
	const {
		data: { nextInvoiceNo, latestInvoiceNo } = {},
		refetch: refetchNextInvoiceNo,
	} = trpc.clients.getNextInvoiceNo.useQuery(
		{
			id: clientId,
		},
		{ enabled: false }
	);

	useEffect(() => {
		if (clientId) {
			refetchBillTo();
			refetchNextInvoiceNo();
		}
	}, [clientId, refetchBillTo, refetchNextInvoiceNo]);

	useEffect(() => {
		if (nextInvoiceNo && !existingInvoice)
			form.setValue("invoiceNo", nextInvoiceNo, { shouldValidate: true });

		form.setValue("billTo", billTo ?? "", { shouldValidate: true });
	}, [billTo, existingInvoice, form, nextInvoiceNo]);

	const { data: { activities } = {} } = trpc.activity.list.useQuery({
		clientId: form.watch("clientId"),
		assigned: false,
	});

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-3">
			<Heading className="pb-4">
				{existingInvoice
					? `Updating ${existingInvoice.invoiceNo}`
					: "Create Invoice"}
			</Heading>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<div className="flex flex-col gap-4 md:flex-row">
						<FormField
							name="clientId"
							control={form.control}
							render={() => (
								<FormItem className="shrink grow basis-1/2">
									<FormLabel required>Client</FormLabel>
									<FormControl>
										<ClientSelect name="clientId" control={form.control} />
									</FormControl>
									<FormDescription>
										Who will this invoice be for?
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="date"
							render={({ field }) => (
								<FormItem className="flex shrink grow basis-1/2 flex-col gap-1 pt-1">
									<FormLabel required>Date</FormLabel>
									<Popover>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													variant={"outline"}
													className={cn(
														"pl-3 text-left font-normal",
														!field.value && "text-muted-foreground"
													)}
												>
													{field.value ? (
														<span>{dayjs.utc(field.value).format("LL")}</span>
													) : (
														<span>Pick a date</span>
													)}
													<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={field.value}
												onSelect={field.onChange}
												disabled={(date) =>
													date > new Date() || date < new Date("1900-01-01")
												}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
									<FormDescription>Date to display on invoice</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<div className="flex flex-col gap-6 md:flex-row">
						<FormField
							name="billTo"
							control={form.control}
							render={({ field }) => (
								<FormItem className="grow basis-1/2">
									<FormLabel required>Bill To</FormLabel>
									<FormControl>
										<Input placeholder="" {...field} />
									</FormControl>
									<FormDescription
										className={cn([
											"overflow-y-hidden transition-[max-height] duration-500 ease-in-out",
											billTo ? "max-h-5" : "max-h-0",
										])}
									>
										{billTo ? "Loaded from client information" : <br />}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							name="invoiceNo"
							control={form.control}
							render={({ field }) => (
								<FormItem className="grow basis-1/2">
									<FormLabel required>Invoice Number</FormLabel>
									<FormControl>
										<Input placeholder={"Smith-XX"} {...field} />
									</FormControl>
									<FormDescription
										className={cn([
											"overflow-y-hidden transition-[max-height] duration-500 ease-in-out",
											billTo ? "max-h-5" : "max-h-0",
										])}
									>
										Previous invoice was {latestInvoiceNo}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{form.watch("clientId") && !!activities?.length && (
						<UnassignedActivities
							activities={activities}
							setValue={form.setValue}
							getValues={form.getValues}
						/>
					)}

					<InvoiceActivityCreationForm
						control={form.control}
						getValues={form.getValues}
						setValue={form.setValue}
						watch={form.watch}
					/>

					<div className="mt-4 flex justify-center gap-4">
						<Button
							type="submit"
							variant={form.formState.isValid ? "default" : "secondary"}
							disabled={!form.formState.isDirty || form.formState.isSubmitting}
						>
							{existingInvoice ? "Update" : "Create"}
						</Button>
						<Button
							type="button"
							onClick={() => router.back()}
							variant="outline"
						>
							Cancel
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export default InvoiceForm;
