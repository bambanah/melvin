import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";

const loginFormSchema = z.object({
	email: z.email(),
	password: z.string().min(1, "Password is required")
});
type LoginFormSchema = z.infer<typeof loginFormSchema>;

interface Props {
	callbackUrl: string;
}

const LoginForm = ({ callbackUrl }: Props) => {
	const form = useForm<LoginFormSchema>({
		resolver: zodResolver(loginFormSchema),
		defaultValues: { email: "", password: "" }
	});

	const onSubmit = async (data: LoginFormSchema) => {
		const { error } = await signIn.email({
			email: data.email,
			password: data.password,
			callbackURL: callbackUrl
		});

		if (error) {
			toast.error(error.message ?? "Couldn't sign in");
		}
	};

	return (
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
				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input type="password" placeholder="Password" {...field} />
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
					Sign in
				</Button>
				<Link
					href="/forgot-password"
					className="text-muted-foreground self-center text-sm underline"
				>
					Forgot your password?
				</Link>
			</form>
		</Form>
	);
};

export default LoginForm;
