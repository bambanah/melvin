import SupportItemSelect from "@/components/forms/support-item-select";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/components/ui/form";
import Heading from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { UserSchema, userSchema } from "@/schema/user-schema";
import { UserFetchOutput } from "@/server/api/routers/user-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

interface Props {
	existingUser: UserFetchOutput;
}

const AccountForm = ({ existingUser }: Props) => {
	const trpcUtils = trpc.useUtils();
	const updateUserMutation = trpc.user.update.useMutation();

	const existingUserWithDefaults = useMemo(
		() => ({
			name: existingUser?.name ?? "",
			defaultSupportItemId: existingUser?.defaultSupportItemId ?? "",
			defaultGroupSupportItemId: existingUser?.defaultGroupSupportItemId ?? "",
			abn: Number(existingUser?.abn) || undefined,
			bankName: existingUser?.bankName ?? "",
			bankNumber: Number(existingUser?.bankNumber) || undefined,
			bsb: existingUser?.bsb ?? undefined
		}),
		[existingUser]
	);

	const form = useForm<UserSchema>({
		mode: "onBlur",
		resolver: zodResolver(userSchema),
		defaultValues: existingUserWithDefaults
	});

	useEffect(() => {
		form.reset(existingUserWithDefaults);
	}, [existingUser, existingUserWithDefaults, form]);

	const onSubmit = (values: UserSchema) => {
		updateUserMutation
			.mutateAsync({
				user: {
					...values,
					defaultSupportItemId: values.defaultSupportItemId || undefined,
					defaultGroupSupportItemId:
						values.defaultGroupSupportItemId || undefined
				}
			})
			.then(() => trpcUtils.user.fetch.invalidate());
	};

	return (
		<div className="mb-8 flex w-full flex-col items-center self-center">
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex w-full flex-col gap-8"
				>
					<div className="flex flex-col gap-4">
						<Heading className="-mb-2" size="small">
							Account Details
						</Heading>
						<FormField
							name="name"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="John Smith" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							name="abn"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>ABN</FormLabel>
									<FormControl>
										<Input
											type="number"
											register={form.register}
											rules={{
												setValueAs: (v) => (v === "" ? undefined : Number(v))
											}}
											placeholder="12345678901"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="flex flex-col gap-4">
						<Heading className="-mb-2" size="small">
							Default Support Items
						</Heading>
						<FormField
							name="defaultSupportItemId"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Default Support Item</FormLabel>
									<FormControl>
										<SupportItemSelect
											onValueChange={field.onChange}
											value={field.value}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							name="defaultGroupSupportItemId"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Default Group Support Item</FormLabel>
									<FormControl>
										<SupportItemSelect
											onValueChange={field.onChange}
											value={field.value}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="flex flex-col gap-4">
						<Heading className="-mb-2" size="small">
							Bank Details
						</Heading>
						<FormField
							name="bankName"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Bank Name</FormLabel>
									<FormControl>
										<Input placeholder="Commonwealth Bank" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							name="bankNumber"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Bank Number</FormLabel>
									<FormControl>
										<Input placeholder="123456789" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							name="bsb"
							control={form.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel>BSB</FormLabel>
									<FormControl>
										<Input type="number" placeholder="123456" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="mt-4 flex justify-center gap-4">
						<Button type="submit" disabled={form.formState.isSubmitting}>
							Save
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export default AccountForm;
