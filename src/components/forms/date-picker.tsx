import type { InputProps } from "@/components/forms/input";
import Input from "@/components/forms/input";
import { FieldValues } from "react-hook-form";

import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/customParseFormat"));

export default function DatePicker<T extends FieldValues>({
	...rest
}: InputProps<T>) {
	return <Input type="date" {...rest} />;
}
