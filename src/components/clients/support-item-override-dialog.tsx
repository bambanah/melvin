import SupportItemSelect from "@/components/forms/support-item-select";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { decimalToCurrencyString } from "@/lib/utils";
import {
	SupportItemRatesSchema,
	supportItemRatesSchema,
} from "@/schema/support-item-rates-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

interface Props {
	clientId: string;
}

const SupportItemOverrideDialog = ({ clientId }: Props) => {
	const [open, setOpen] = useState(false);

	const form = useForm<SupportItemRatesSchema>({
		resolver: zodResolver(supportItemRatesSchema),
		defaultValues: {
			supportItemId: "",
		},
	});

	const trpcUtils = trpc.useUtils();

	const { data: supportItem } = trpc.supportItem.byId.useQuery(
		{
			id: form.watch("supportItemId"),
		},
		{ enabled: !!form.watch("supportItemId") }
	);
	const { mutateAsync: addCustomRates } =
		trpc.supportItem.addCustomRates.useMutation();

	async function onSubmit(values: SupportItemRatesSchema) {
		await addCustomRates(
			{ supportItemRates: { ...values, clientId } },
			{
				onSuccess: () => {
					setOpen(false);
				},
				onError: (e) => {
					toast.error(e.message);
				},
			}
		);

		trpcUtils.supportItem.getCustomRatesForClient.invalidate({ id: clientId });
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			setOpen(false);

			// Use timeout to prevent layout shifts when clearing before closing animation complete
			setTimeout(() => {
				form.reset();
			}, 100);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button size="sm" onClick={() => setOpen(true)} variant="secondary">
					<PlusIcon className="mr-2 h-4 w-4" /> Add Custom Rates
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader className="sm:max-w-[425px]">
					<DialogTitle>Add Custom Rates</DialogTitle>
					<DialogDescription>
						Add custom rates for a specific support item that only apply to this
						client.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex flex-col gap-4"
					>
						<FormField
							control={form.control}
							name="supportItemId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Support Item</FormLabel>
									<FormControl>
										<SupportItemSelect {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Separator className="my-4" />

						{(
							[
								["Weekday Daytime", "weekdayRate"],
								["Weekday Evening", "weeknightRate"],
								["Saturday", "saturdayRate"],
								["Sunday", "sundayRate"],
							] as const
						).map(([label, accessor]) => (
							<FormField
								key={accessor}
								control={form.control}
								name={accessor}
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{label}{" "}
											{supportItem?.[accessor] && (
												<span>
													- {decimalToCurrencyString(supportItem[accessor])}
												</span>
											)}
										</FormLabel>
										<FormControl>
											<Input
												placeholder={
													supportItem?.[accessor]
														? Number(supportItem?.[accessor]).toFixed(2)
														: undefined
												}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						))}

						<div className="mt-8 text-right">
							<Button type="submit" className="">
								Add Override
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default SupportItemOverrideDialog;
