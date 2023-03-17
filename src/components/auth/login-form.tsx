import Button from "@atoms/button";
import Form from "@atoms/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginFormSchema = z.object({
	email: z.string().email(),
});
type LoginFormSchema = z.infer<typeof loginFormSchema>;

const LoginForm = () => {
	const { register, handleSubmit } = useForm<LoginFormSchema>({
		resolver: zodResolver(loginFormSchema),
	});

	const onSubmit = (data: LoginFormSchema) => {
		signIn("email", { email: data.email });
	};

	return (
		<Form onSubmit={handleSubmit(onSubmit)}>
			<input
				className="grow border bg-neutral-50 py-3 px-6 text-fg"
				placeholder="Email Address"
				{...register("email")}
			/>
			<Button type="submit" variant="primary">
				Continue
			</Button>
		</Form>
	);
};

export default LoginForm;
