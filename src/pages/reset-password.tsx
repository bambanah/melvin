import AuthModal from "@/components/auth/auth-modal";
import AuthTextField from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Heading from "@/components/ui/heading";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";

const resetPasswordSchema = z
	.object({
		password: z.string().min(8, "Use at least 8 characters"),
		confirmPassword: z.string()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"]
	});
type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
	const router = useRouter();
	// better-auth's /reset-password/:token callback redirects here with a
	// token query param on success; expired or already-used links arrive with
	// an `error` param and no token, so the missing-token gate covers both.
	const token = String(router.query.token ?? "");

	const form = useForm<ResetPasswordSchema>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: { password: "", confirmPassword: "" }
	});

	const onSubmit = async (data: ResetPasswordSchema) => {
		const { error } = await authClient.resetPassword({
			newPassword: data.password,
			token
		});

		if (error) {
			toast.error(error.message ?? "Couldn't reset your password");
			return;
		}

		toast.success("Password updated - sign in with it now");
		router.push("/login");
	};

	if (!token) {
		return (
			<AuthModal>
				<Heading>Link expired</Heading>
				<p className="text-center">
					That reset link is no longer valid. Request a new one.
				</p>
				<Link
					href="/forgot-password"
					className="text-muted-foreground text-sm underline"
				>
					Send another reset link
				</Link>
			</AuthModal>
		);
	}

	return (
		<AuthModal>
			<Heading>Choose a new password</Heading>

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex w-full flex-col gap-4"
				>
					<AuthTextField
						control={form.control}
						name="password"
						type="password"
						placeholder="New password"
					/>
					<AuthTextField
						control={form.control}
						name="confirmPassword"
						type="password"
						placeholder="Confirm new password"
					/>
					<Button
						type="submit"
						className="w-full"
						disabled={form.formState.isSubmitting}
					>
						Set password
					</Button>
				</form>
			</Form>
		</AuthModal>
	);
}
