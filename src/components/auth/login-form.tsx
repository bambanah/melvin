import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormControl, FormField, FormItem, FormMessage } from "../ui/form";

const loginFormSchema = z.object({
	email: z.string().email(),
});
type LoginFormSchema = z.infer<typeof loginFormSchema>;

const LoginForm = () => {
	const form = useForm<LoginFormSchema>({
		resolver: zodResolver(loginFormSchema),
	});

	const onSubmit = (data: LoginFormSchema) => {
		signIn("email", { email: data.email });
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input placeholder={"Email Address"} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button type="submit" className="mt-4 w-full">
					Continue
				</Button>
			</form>
		</Form>
	);
};

export default LoginForm;
