import type { InputProps } from "@components/forms/input";
import Input from "@components/forms/input";

import dayjs from "dayjs";
import { FieldValues } from "react-hook-form";
dayjs.extend(require("dayjs/plugin/customParseFormat"));

export default function TimeInput<T extends FieldValues>({
	rules,
	...rest
}: InputProps<T>) {
	return (
		<Input
			type="time"
			rules={{
				...rules,
				setValueAs: (value) => {
					return dayjs(value, "HH:mm").toDate();
				},
			}}
			{...rest}
		/>
	);
}
