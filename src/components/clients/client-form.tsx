import Button from "@atoms/button";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Label from "@atoms/label";
import Subheading from "@atoms/subheading";
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
		watch,
	} = useForm<ClientSchema>({
		resolver: zodResolver(clientSchema),
		defaultValues: {
			name: existingClient?.name ?? "",
			number: existingClient?.number ?? "",
			billTo: existingClient?.billTo ?? "",
			invoiceNumberPrefix: existingClient?.invoiceNumberPrefix ?? "",
		},
	});

	const submitCallback = (successMessage: string) => {
		trpcContext.clients.list.invalidate();
		toast.success(successMessage);

		router.back();
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
		<div className="mb-8 flex max-w-xl flex-col items-center gap-8 self-center p-6">
			<Heading>
				{existingClient ? `Updating ${existingClient.name}` : "Add New Client"}
			</Heading>
			<p className="text-center">
				All fields except <b>Participant Name</b> can be modified directly on an
				Invoice.
			</p>
			<Form onSubmit={handleSubmit(onSubmit)}>
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
				<Label htmlFor="invoiceNumberPrefix">
					<span>Invoice Prefix</span>
					<Subheading>
						Default prefix to use for invoice numbers (
						{watch("invoiceNumberPrefix") || "Smith-"}XX)
					</Subheading>
					<Input
						name="invoiceNumberPrefix"
						type="text"
						register={register}
						error={!!errors.invoiceNumberPrefix}
						placeholder="Smith-"
					/>
					<ErrorMessage error={errors.invoiceNumberPrefix?.message} />
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

				<div className="btn-group">
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
				</div>
			</Form>
		</div>
	);
};

export default ClientForm;
