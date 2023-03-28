import Button from "@atoms/button";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Label from "@atoms/label";
import ErrorMessage from "@components/forms/error-message";
import Input from "@components/forms/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserSchema, userSchema } from "@schema/user-schema";
import { UserFetchOutput } from "@server/api/routers/user-router";
import { trpc } from "@utils/trpc";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

interface Props {
	existingUser: UserFetchOutput;
}

const AccountForm = ({ existingUser }: Props) => {
	const router = useRouter();

	const trpcContext = trpc.useContext();
	const updateUserMutation = trpc.user.update.useMutation();

	const {
		register,
		handleSubmit,
		formState: { isDirty, isValid, isSubmitting, errors },
	} = useForm<UserSchema>({
		resolver: zodResolver(userSchema),
		defaultValues: {
			name: existingUser?.name ?? "",
			abn: Number(existingUser?.abn) || undefined,
			bankName: existingUser?.bankName ?? "",
			bankNumber: Number(existingUser?.bankNumber) || undefined,
			bsb: existingUser?.bsb || undefined,
		},
	});

	const submitCallback = (successMessage: string) => {
		toast.success(successMessage);

		trpcContext.user.fetch.invalidate();
		router.push("/invoices");
	};

	const onSubmit = (data: UserSchema) => {
		if (isDirty) {
			updateUserMutation
				.mutateAsync({ user: data })
				.then(() => submitCallback("User updated"));
		}
	};

	return (
		<div className="mb-8 flex w-80 flex-col items-center self-center">
			<Form
				onSubmit={handleSubmit(onSubmit)}
				className="flex w-full flex-col gap-8"
			>
				<div className="flex flex-col gap-4">
					<Heading className="-mb-2" variant="SMALL">
						Account Details
					</Heading>
					<Label htmlFor="name">
						<span>Name</span>
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
						<span>ABN</span>
						<Input
							name="abn"
							type="text"
							register={register}
							rules={{
								setValueAs: (v) => (v === "" ? null : Number(v)),
							}}
							error={!!errors.abn}
							placeholder="12345678901"
						/>
						<ErrorMessage error={errors.abn?.message} />
					</Label>
				</div>

				<div className="flex flex-col gap-4">
					<Heading className="-mb-2" variant="SMALL">
						Bank Details
					</Heading>
					<Label htmlFor="bankName">
						<span>Bank Name</span>
						<Input
							name="bankName"
							type="text"
							register={register}
							error={!!errors.bankName}
							placeholder="Commonwealth Bank"
						/>
						<ErrorMessage error={errors.bankName?.message} />
					</Label>
					<Label htmlFor="bankNumber">
						<span>Bank Number</span>
						<Input
							name="bankNumber"
							type="text"
							register={register}
							rules={{
								setValueAs: (v) => (v === "" ? null : Number(v)),
							}}
							error={!!errors.bankNumber}
							placeholder="123456789"
						/>
						<ErrorMessage error={errors.bankNumber?.message} />
					</Label>
					<Label htmlFor="bsb">
						<span>BSB</span>
						<Input
							name="bsb"
							type="text"
							register={register}
							rules={{
								setValueAs: (v) => (v === "" ? null : Number(v)),
							}}
							error={!!errors.bsb}
							placeholder="123-456"
						/>
						<ErrorMessage error={errors.bsb?.message} />
					</Label>
				</div>

				<div className="btn-group mt-4">
					<Button
						type="submit"
						variant="primary"
						disabled={isSubmitting || !isDirty || !isValid}
					>
						Update
					</Button>
					<Link href="/invoices">
						<Button type="button">Cancel</Button>
					</Link>
				</div>
			</Form>
		</div>
	);
};

export default AccountForm;
