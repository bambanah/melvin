import Button from "@atoms/button";
import Heading from "@atoms/heading";
import Label from "@atoms/label";
import DatePicker from "@components/forms/date-picker";
import SupportItemSelect from "@components/forms/support-item-select";
import TimeInput from "@components/forms/time-input";
import { faCalendar, faClock } from "@fortawesome/free-regular-svg-icons";
import {
	faArrowDown,
	faArrowRight,
	faArrowUp,
	faPlus,
	faX,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { InvoiceSchema } from "@schema/invoice-schema";
import classNames from "classnames";
import {
	Control,
	UseFormGetValues,
	UseFormRegister,
	UseFormSetValue,
	useFieldArray,
} from "react-hook-form";

interface Props {
	control: Control<InvoiceSchema>;
	register: UseFormRegister<InvoiceSchema>;
	getValues: UseFormGetValues<InvoiceSchema>;
	setValue: UseFormSetValue<InvoiceSchema>;
}

const InvoiceActivityCreationForm = ({
	control,
	register,
	getValues,
	setValue,
}: Props) => {
	const {
		fields,
		append: appendActivity,
		remove,
		update,
	} = useFieldArray({
		control,
		name: "activitiesToCreate",
	});

	const handleMove = (
		direction: "UP" | "DOWN",
		previousFieldIndex: number,
		activityFieldIndex: number
	) => {
		const newIndex =
			direction === "UP" ? previousFieldIndex - 1 : previousFieldIndex + 1;

		if (newIndex < 0 || newIndex > fields.length - 1) {
			return;
		}

		const previousActivities =
			getValues().activitiesToCreate[previousFieldIndex].activities;
		const activityToMove = previousActivities[activityFieldIndex];

		setValue(`activitiesToCreate.${previousFieldIndex}.activities`, [
			...previousActivities.slice(0, activityFieldIndex),
			...previousActivities.slice(activityFieldIndex + 1),
		]);

		update(newIndex, {
			...getValues().activitiesToCreate[newIndex],
			activities: [
				...getValues().activitiesToCreate[newIndex].activities,
				activityToMove,
			],
		});
	};

	const handleDelete = (fieldIndex: number, activityFieldIndex: number) => {
		fields[fieldIndex].activities.splice(activityFieldIndex, 1);
		const field = getValues().activitiesToCreate[fieldIndex];

		update(fieldIndex, {
			...field,
			activities: [
				...field.activities.slice(0, activityFieldIndex),
				...field.activities.slice(activityFieldIndex),
			],
		});
	};

	return (
		<div className="flex flex-col gap-4">
			<Heading size="xsmall">Create Activities</Heading>

			{fields.length > 0 && (
				<div className="mb-4 flex flex-col gap-6">
					{fields.map((field, index) => (
						<div key={field.id} className="flex flex-col">
							<div className="flex items-center gap-2">
								<SupportItemSelect
									name={`activitiesToCreate.${index}.supportItemId`}
									control={control}
								/>
								<button
									className="px-2 py-1 hover:shadow"
									onClick={() => remove(index)}
								>
									<FontAwesomeIcon icon={faX} />
								</button>
							</div>

							<ul className="tree">
								{fields[index].activities.map((_, activityFieldIndex) => (
									<li
										className="flex w-full items-center justify-start gap-4"
										key={activityFieldIndex}
									>
										{fields.length > 1 && (
											<div className="flex flex-col justify-center gap-0">
												<button
													className={classNames([
														"px-2 py-0 text-zinc-500 transition-colors hover:text-zinc-900 hover:shadow",
														index === 0 && "hidden",
													])}
													onClick={() =>
														handleMove("UP", index, activityFieldIndex)
													}
												>
													<FontAwesomeIcon icon={faArrowUp} />
												</button>
												<button
													className={classNames([
														"px-2 py-0 text-zinc-500 transition-colors hover:text-zinc-900 hover:shadow",
														index === fields.length - 1 && "hidden",
													])}
													onClick={() =>
														handleMove("DOWN", index, activityFieldIndex)
													}
												>
													<FontAwesomeIcon icon={faArrowDown} />
												</button>
											</div>
										)}
										<span className="flex items-center gap-2">
											<FontAwesomeIcon icon={faCalendar} />
											<Label>
												<DatePicker
													register={register}
													name={`activitiesToCreate.${index}.activities.${activityFieldIndex}.date`}
												/>
											</Label>
										</span>
										<span className="flex items-center gap-2">
											<FontAwesomeIcon icon={faClock} />
											<Label>
												<TimeInput
													register={register}
													name={`activitiesToCreate.${index}.activities.${activityFieldIndex}.startTime`}
												/>
											</Label>
											<FontAwesomeIcon icon={faArrowRight} />
											<Label>
												<TimeInput
													register={register}
													name={`activitiesToCreate.${index}.activities.${activityFieldIndex}.endTime`}
												/>
											</Label>
										</span>
										<button
											className="ml-auto px-2 py-1 hover:shadow"
											onClick={() => handleDelete(index, activityFieldIndex)}
										>
											<FontAwesomeIcon icon={faX} />
										</button>
									</li>
								))}
								<li>
									<Button
										onClick={() => field.activities.push({ date: "" })}
										className="mt-2 w-16 px-8 py-2"
									>
										<FontAwesomeIcon icon={faPlus} />
									</Button>
								</li>
							</ul>
						</div>
					))}
				</div>
			)}

			<Button
				onClick={() =>
					appendActivity({ supportItemId: "", activities: [{ date: "" }] })
				}
				className="mx-auto w-full"
			>
				+ Add Support Item
			</Button>
		</div>
	);
};

export default InvoiceActivityCreationForm;
