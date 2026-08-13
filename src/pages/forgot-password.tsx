import AuthModal from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage
} from "@/components/ui/form";
import Heading from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";

const forgotPasswordSchema = z.object({ email: z.email() });
type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
	const [sent, setSent] = useState(false);
	const form = useForm<ForgotPasswordSchema>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: { email: "" }
	});

	const onSubmit = async (data: ForgotPasswordSchema) => {
		const { error } = await authClient.requestPasswordReset({
			email: data.email,
			redirectTo: "/reset-password"
		});

		if (error) {
			toast.error(error.message ?? "Couldn't send the reset email");
			return;
		}

		setSent(true);
	};

	return (
		<AuthModal>
			<Heading>Reset your password</Heading>

			{sent ? (
				<p className="text-center">
					If that email address has an account, a reset link is on its way.
				</p>
			) : (
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex w-full flex-col gap-4"
					>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Input placeholder="Email Address" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button
							type="submit"
							className="w-full"
							disabled={form.formState.isSubmitting}
						>
							Send reset link
						</Button>
					</form>
				</Form>
			)}

			<Link href="/login" className="text-muted-foreground text-sm underline">
				Back to sign in
			</Link>
		</AuthModal>
	);
}
