import type { InputProps } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { FieldValues } from "react-hook-form";

import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/utc"));
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
			}}
			{...rest}
		/>
	);
}
