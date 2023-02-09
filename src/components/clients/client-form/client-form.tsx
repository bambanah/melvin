import Button from "@atoms/button";
import ButtonGroup from "@atoms/button-group";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Label from "@atoms/label";
import ErrorMessage from "@components/forms/error-message";
import Input from "@components/forms/input";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ClientSchema } from "@schema/client-schema";
import { clientSchema } from "@schema/client-schema";
import { ClientByIdOutput } from "@server/routers/client-router";
import { trpc } from "@utils/trpc";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import * as Styles from "./styles";

interface Props {
	existingClient?: ClientByIdOutput;
}

const ClientForm = ({ existingClient }: Props) => {
	const formPurpose = existingClient ? "update" : "create";

	const router = useRouter();

	const trpcContext = trpc.useContext();
	const updateClientMutation = trpc.clients.update.useMutation();
	const createClientMutation = trpc.clients.create.useMutation();

	const {
		register,
		handleSubmit,
		formState: { isDirty, isValid, isSubmitting, errors },
	} = useForm<ClientSchema>({
		resolver: zodResolver(clientSchema),
		defaultValues: {
			name: existingClient?.name ?? "",
			number: existingClient?.number ?? "",
			billTo: existingClient?.billTo ?? "",
		},
	});

	const submitCallback = (successMessage: string) => {
		toast.success(successMessage);

		trpcContext.clients.list.invalidate();
		router.push("/clients");
	};
	const onSubmit = (data: ClientSchema) => {
		if (existingClient?.id) {
			updateClientMutation
				.mutateAsync({ id: existingClient.id, client: data })
				.then(() => submitCallback("Client updated"));
		} else {
			createClientMutation
				.mutateAsync({
					client: data,
				})
				.then(() => submitCallback("Client created"));
		}
	};

	return (
		<Styles.ClientContainer>
			<Heading>
				{existingClient ? `Updating ${existingClient.name}` : "Add New Client"}
			</Heading>
			<Form onSubmit={handleSubmit(onSubmit)} flexDirection="column">
				<Label htmlFor="name" required>
					<span>Participant Name</span>
					<Input
						name="name"
						type="text"
						register={register}
						error={!!errors.name}
						placeholder="John Smith"
					/>
					<ErrorMessage error={errors.name?.message} />
				</Label>
				<Label htmlFor="number">
					<span>Participant Number</span>
					<Input
						name="number"
						type="text"
						register={register}
						error={!!errors.number}
						placeholder="123456789"
					/>
					<ErrorMessage error={errors.number?.message} />
				</Label>
				<Label htmlFor="billTo">
					<span>Bill To</span>
					<Input
						name="billTo"
						type="text"
						register={register}
						error={!!errors.billTo}
						placeholder="HELP Enterprises"
					/>
					<ErrorMessage error={errors.billTo?.message} />
				</Label>

				<ButtonGroup>
					<Button
						type="submit"
						variant="primary"
						disabled={isSubmitting || !isDirty || !isValid}
					>
						{formPurpose.charAt(0).toUpperCase() + formPurpose.slice(1)}
					</Button>
					<Link href="/clients">
						<Button type="button">Cancel</Button>
					</Link>
				</ButtonGroup>
			</Form>
		</Styles.ClientContainer>
	);
};

export default ClientForm;
