import type { InputProps } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { FieldValues } from "react-hook-form";

export default function DatePicker<T extends FieldValues>({
	...rest
}: InputProps<T>) {
	return <Input type="date" {...rest} />;
}
