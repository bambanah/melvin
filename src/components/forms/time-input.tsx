import type { InputProps } from "@components/forms/input";
import Input from "@components/forms/input";
import { FieldValues } from "react-hook-form";

import dayjs from "dayjs";
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
