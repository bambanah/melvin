import Button from "@atoms/button";
import Form from "@atoms/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import styled from "styled-components";
import { z } from "zod";

const StyledInput = styled.input`
	color: ${({ theme }) => theme.colors.fg};
	background-color: ${({ theme }) => theme.colors.bg};

	flex-grow: 1;

	outline: none;
	padding: 0.85rem 1.4rem;
	border: 0.01rem solid
		${({ theme }) => {
			return `${theme.colors.fg}88`;
		}};
`;

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
			<StyledInput placeholder="Email Address" {...register("email")} />
			<Button type="submit" variant="primary">
				Continue
			</Button>
		</Form>
	);
};

export default LoginForm;
