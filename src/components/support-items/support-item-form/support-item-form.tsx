import { RateType } from ".prisma/client";
import Button from "@atoms/button";
import ButtonGroup from "@atoms/button-group";
import Form from "@atoms/form";
import Heading from "@atoms/heading";
import Label from "@atoms/label";
import Subheading from "@atoms/subheading";
import ErrorMessage from "@components/forms/error-message";
import Input from "@components/forms/input";
import Select from "@components/forms/select";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SupportItemSchema } from "@schema/support-item-schema";
import { supportItemSchema } from "@schema/support-item-schema";
import { SupportItemByIdOutput } from "@server/routers/support-item-router";
import { trpc } from "@utils/trpc";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import * as Styles from "./styles";

interface Props {
	existingSupportItem?: SupportItemByIdOutput;
}

const SupportItemForm = ({ existingSupportItem }: Props) => {
	const formPurpose = existingSupportItem ? "update" : "create";

	const router = useRouter();

	const trpcContext = trpc.useContext();
	const createSupportItemMutation = trpc.supportItem.create.useMutation();
	const updateSupportItemMutation = trpc.supportItem.update.useMutation();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting, isDirty, isValid },
		control,
	} = useForm<SupportItemSchema>({
		resolver: zodResolver(supportItemSchema),
		defaultValues: {
			description: existingSupportItem?.description ?? "",
			rateType: existingSupportItem?.rateType ?? RateType.HOUR,
			weekdayCode: existingSupportItem?.weekdayCode ?? "",
			weekdayRate: Number(existingSupportItem?.weekdayRate) || undefined,
			weeknightCode: existingSupportItem?.weeknightCode ?? "",
			weeknightRate: Number(existingSupportItem?.weeknightRate) || undefined,
			saturdayCode: existingSupportItem?.saturdayCode ?? "",
			saturdayRate: Number(existingSupportItem?.saturdayRate) || undefined,
			sundayCode: existingSupportItem?.sundayCode ?? "",
			sundayRate: Number(existingSupportItem?.sundayRate) || undefined,
		},
	});

	const onSubmit = (data: SupportItemSchema) => {
		if (existingSupportItem?.id) {
			updateSupportItemMutation
				.mutateAsync({ supportItem: { ...data, id: existingSupportItem.id } })
				.then(() => {
					toast.success("Support Item updated");

					trpcContext.supportItem.list.invalidate();
					router.push("/support-items");
				});
		} else {
			createSupportItemMutation
				.mutateAsync({
					supportItem: data,
				})
				.then(() => {
					toast.success("Support Item created");

					trpcContext.supportItem.list.invalidate();
					router.push("/support-items");
				});
		}
	};

	return (
		<Styles.CreateActivityContainer>
			<Heading>
				{existingSupportItem
					? `Updating ${existingSupportItem.description}`
					: "Create New Support Item"}
			</Heading>
			<Form onSubmit={handleSubmit(onSubmit)} flexDirection="column">
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
								options={[
									{ label: "per hour", value: RateType.HOUR },
									{ label: "per km", value: RateType.KM },
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
					<Button
						type="submit"
						variant="primary"
						disabled={isSubmitting || !isDirty || !isValid}
					>
						{formPurpose.charAt(0).toUpperCase() + formPurpose.slice(1)}
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
