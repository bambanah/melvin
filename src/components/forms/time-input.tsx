import type { InputProps } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { FieldValues } from "react-hook-form";

export default function TimeInput<T extends FieldValues>({
	rules,
	...rest
}: InputProps<T>) {
	return (
		<Input
			type="time"
			rules={{
				...rules
			}}
			{...rest}
		/>
	);
}
