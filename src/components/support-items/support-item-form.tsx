import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import type { SupportItemSchema } from "@/schema/support-item-schema";
import { supportItemSchema } from "@/schema/support-item-schema";
import { SupportItemByIdOutput } from "@/server/api/routers/support-item-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { RateType } from "@prisma/client";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

interface Props {
	existingSupportItem?: SupportItemByIdOutput;
}

const SupportItemForm = ({ existingSupportItem }: Props) => {
	const formPurpose = existingSupportItem ? "update" : "create";

	const router = useRouter();

	const trpcUtils = trpc.useUtils();
	const createSupportItemMutation = trpc.supportItem.create.useMutation();
	const updateSupportItemMutation = trpc.supportItem.update.useMutation();

	const form = useForm<SupportItemSchema>({
		resolver: zodResolver(supportItemSchema),
		defaultValues: {
			description: existingSupportItem?.description ?? "",
			rateType: existingSupportItem?.rateType ?? RateType.HOUR,
			isGroup: existingSupportItem?.isGroup ?? false,
			weekdayCode: existingSupportItem?.weekdayCode ?? "",
			weekdayRate: Number(existingSupportItem?.weekdayRate) || undefined,
			weeknightCode: existingSupportItem?.weeknightCode ?? "",
			weeknightRate: Number(existingSupportItem?.weeknightRate) || undefined,
			saturdayCode: existingSupportItem?.saturdayCode ?? "",
			saturdayRate: Number(existingSupportItem?.saturdayRate) || undefined,
			sundayCode: existingSupportItem?.sundayCode ?? "",
			sundayRate: Number(existingSupportItem?.sundayRate) || undefined,
		},
		mode: "onBlur",
	});

	const onSubmit = (data: SupportItemSchema) => {
		if (existingSupportItem?.id) {
			updateSupportItemMutation
				.mutateAsync({ supportItem: { ...data, id: existingSupportItem.id } })
				.then(() => {
					toast.success("Support Item updated");

					trpcUtils.supportItem.list.invalidate();
					trpcUtils.supportItem.byId.invalidate({
						id: existingSupportItem.id,
					});
					router.push("/dashboard/support-items");
				});
		} else {
			createSupportItemMutation
				.mutateAsync({
					supportItem: data,
				})
				.then(() => {
					toast.success("Support Item created");

					trpcUtils.supportItem.list.invalidate();
					router.push("/dashboard/support-items");
				});
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-4 py-6">
			<Heading>
				{existingSupportItem
					? `Updating ${existingSupportItem.description}`
					: "Create New Support Item"}
			</Heading>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<div className="flex shrink flex-col gap-4">
						<Heading size="small">General</Heading>
						<div className="flex w-full gap-4">
							<FormField
								name="description"
								control={form.control}
								render={({ field }) => (
									<FormItem className="grow basis-1/2">
										<FormLabel required>Description</FormLabel>
										<FormControl>
											<Input placeholder="Description" {...field} />
										</FormControl>
										<FormDescription>
											The official description from the{" "}
											<a href="/price-guide-22-23.pdf">Price Guide</a>
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="rateType"
								render={({ field }) => (
									<FormItem className="grow basis-1/2">
										<FormLabel required>Rate Type</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select a verified email to display" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value={RateType.HOUR}>per hour</SelectItem>
												<SelectItem value={RateType.KM}>per km</SelectItem>
											</SelectContent>
										</Select>
										<FormDescription>
											This will almost always be per hour
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<FormField
							control={form.control}
							name="isGroup"
							render={({ field }) => (
								<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border px-4 py-3">
									<FormControl>
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<FormLabel className="w-full cursor-pointer">
										Is this a group activity?
									</FormLabel>
								</FormItem>
							)}
						/>
					</div>

					<div className="mt-4 flex flex-col gap-4">
						<Heading size="small">Rates</Heading>
						<FormDescription>
							Only the weekday information is required, and will be used in the
							event of another rate not being entered
						</FormDescription>

						{(["weekday", "weeknight", "saturday", "sunday"] as const).map(
							(day) => (
								<div className="flex w-full items-start gap-4" key={day}>
									<p className="mt-3 flex w-16 shrink-0 gap-1 text-sm font-semibold md:w-24 md:text-base">
										{day.charAt(0).toUpperCase() + day.slice(1)}{" "}
										<span className="text-red-500">
											{day === "weekday" && "*"}
										</span>
									</p>
									<div className="flex w-full gap-2">
										<FormField
											name={`${day}Code`}
											control={form.control}
											render={({ field }) => (
												<FormItem className="grow basis-1/2">
													<FormControl>
														<Input placeholder="XX_XXX_XXXX_X_X" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											name={`${day}Rate`}
											control={form.control}
											render={({ field }) => (
												<FormItem className="grow basis-1/2">
													<FormControl>
														<Input
															type="number"
															step={0.01}
															register={form.register}
															rules={{
																setValueAs: (v) =>
																	v === "" ? undefined : Number(v),
															}}
															placeholder="rate"
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</div>
							)
						)}
					</div>

					<div className="mt-4 flex justify-center gap-4">
						<Button
							type="submit"
							disabled={form.formState.isSubmitting || !form.formState.isDirty}
						>
							{formPurpose.charAt(0).toUpperCase() + formPurpose.slice(1)}
						</Button>
						<Button
							type="button"
							variant="secondary"
							onClick={() => router.back()}
						>
							Cancel
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export default SupportItemForm;
