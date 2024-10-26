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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
	supportItemId: z.string(),
	weekdayRate: z.coerce.number().step(0.01).optional(),
	weeknightRate: z.coerce.number().step(0.01).optional(),
	saturdayRate: z.coerce.number().step(0.01).optional(),
	sundayRate: z.coerce.number().step(0.01).optional(),
});

const SupportItemOverrideDialog = () => {
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			supportItemId: "",
		},
	});

	const { data: supportItem } = trpc.supportItem.byId.useQuery(
		{
			id: form.watch("supportItemId"),
		},
		{ enabled: !!form.watch("supportItemId") }
	);

	function onSubmit(values: z.infer<typeof formSchema>) {
		alert(JSON.stringify(values));
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			// Use timeout to prevent layout shifts when clearing before closing animation complete
			setTimeout(() => {
				form.reset();
			}, 100);
		}
	}

	return (
		<Dialog onOpenChange={handleOpenChange}>
			<DialogTrigger>Add Custom Rates</DialogTrigger>
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
														: "12"
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
