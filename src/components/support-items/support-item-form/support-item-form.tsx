import Button from "@atoms/button";
import ButtonGroup from "@atoms/button-group";
import Label from "@atoms/label";
import Subheading from "@atoms/subheading";
import ErrorMessage from "@components/forms/error-message";
import Input from "@components/forms/input";
import Select from "@components/forms/select";
import { Form } from "@components/navigation/login-form/styles";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@utils/trpc";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";
import { supportItemFormSchema } from "./schema";
import * as Styles from "./styles";

interface Props {
	purpose?: "create" | "update";
}

type FormData = z.infer<typeof supportItemFormSchema>;

const SupportItemForm = ({ purpose }: Props) => {
	const formPurpose = purpose ?? "create";

	const router = useRouter();

	const trpcContext = trpc.useContext();
	const createSupportItemMutation = trpc.supportItem.add.useMutation();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		control,
	} = useForm<FormData>({ resolver: zodResolver(supportItemFormSchema) });

	const onSubmit = (data: FormData) => {
		createSupportItemMutation
			.mutateAsync({
				supportItem: data,
			})
			.then(async () => {
				toast.success("Support Item Created");

				trpcContext.supportItem.list.invalidate();

				await new Promise((r) => setTimeout(r, 2000));

				router.push("/support-items");
			});
	};

	return (
		<Styles.CreateActivityContainer>
			<Form onSubmit={handleSubmit(onSubmit)}>
				<Styles.InputGroup>
					<Styles.Heading>General</Styles.Heading>
					<Styles.InputRow>
						<Label htmlFor="description" required>
							<span>Description</span>
							<Subheading>
								The official description from the{" "}
								<a href="/price-guide-3-21.pdf">Price Guide</a>
							</Subheading>
							<Input
								name="description"
								register={register}
								type="text"
								placeholder="Description"
							/>
							<ErrorMessage error={errors.description?.message} />
						</Label>

						<Label htmlFor="rateType" required>
							<span>Rate Type</span>
							<Subheading>This will almost always be per hour</Subheading>
							<Select
								name="rateType"
								control={control}
								defaultValue="HOUR"
								options={[
									{ label: "per hour", value: "HOUR" },
									{ label: "per km", value: "KM" },
								]}
							/>
							<ErrorMessage error={errors.rateType?.message} />
						</Label>
					</Styles.InputRow>
				</Styles.InputGroup>

				<Styles.InputGroup>
					<Styles.Heading>Rates</Styles.Heading>
					<Subheading>
						Only the weekday information is required, and will be used in the
						event of another rate not being entered
					</Subheading>

					<Styles.ActivityRow>
						<Label required>
							<span>Weekday</span>
						</Label>
						<Styles.InputContainer>
							<Input
								name="weekdayCode"
								register={register}
								type="text"
								placeholder="XX_XXX_XXXX_X_X"
							/>
							<ErrorMessage error={errors.weekdayCode?.message} />
						</Styles.InputContainer>

						<Styles.InputContainer>
							<Input
								name="weekdayRate"
								register={register}
								rules={{
									valueAsNumber: true,
								}}
								type="number"
								step="0.01"
								prefix="$"
							/>
							<ErrorMessage error={errors.weekdayRate?.message} />
						</Styles.InputContainer>
					</Styles.ActivityRow>

					<Styles.ActivityRow>
						<Label>
							<span>Weeknight</span>
						</Label>
						<Styles.InputContainer>
							<Input
								name="weeknightCode"
								register={register}
								type="text"
								placeholder="XX_XXX_XXXX_X_X"
							/>
							<ErrorMessage error={errors.weeknightCode?.message} />
						</Styles.InputContainer>

						<Styles.InputContainer>
							<Input
								name="weeknightRate"
								register={register}
								rules={{
									setValueAs: (v) => (v === "" ? undefined : Number(v)),
								}}
								type="text"
								step="0.01"
								prefix="$"
							/>
							<ErrorMessage error={errors.weeknightRate?.message} />
						</Styles.InputContainer>
					</Styles.ActivityRow>

					<Styles.ActivityRow>
						<Label>
							<span>Saturday</span>
						</Label>
						<Styles.InputContainer>
							<Input
								name="saturdayCode"
								register={register}
								type="text"
								placeholder="XX_XXX_XXXX_X_X"
							/>
							<ErrorMessage error={errors.saturdayCode?.message} />
						</Styles.InputContainer>

						<Styles.InputContainer>
							<Input
								name="saturdayRate"
								register={register}
								rules={{
									setValueAs: (v) => (v === "" ? undefined : Number(v)),
								}}
								type="number"
								step="0.01"
								prefix="$"
							/>
							<ErrorMessage error={errors.saturdayRate?.message} />
						</Styles.InputContainer>
					</Styles.ActivityRow>

					<Styles.ActivityRow>
						<Label>
							<span>Sunday</span>
						</Label>
						<Styles.InputContainer>
							<Input
								name="sundayCode"
								register={register}
								type="text"
								placeholder="XX_XXX_XXXX_X_X"
							/>
							<ErrorMessage error={errors.sundayCode?.message} />
						</Styles.InputContainer>

						<Styles.InputContainer>
							<Input
								name="sundayRate"
								register={register}
								rules={{
									setValueAs: (v) => (v === "" ? undefined : Number(v)),
								}}
								type="number"
								step="0.01"
								prefix="$"
							/>
							<ErrorMessage error={errors.sundayRate?.message} />
						</Styles.InputContainer>
					</Styles.ActivityRow>
				</Styles.InputGroup>

				<ButtonGroup>
					<Button type="submit" variant="primary" disabled={isSubmitting}>
						{formPurpose === "create" ? "Create" : "Update"}
					</Button>
					<Link href="/support-items">
						<Button type="button">Cancel</Button>
					</Link>
				</ButtonGroup>
			</Form>
		</Styles.CreateActivityContainer>
	);
};

export default SupportItemForm;
