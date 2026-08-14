import {
	FormControl,
	FormField,
	FormItem,
	FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Control, FieldValues, Path } from "react-hook-form";

interface Props<T extends FieldValues> {
	control: Control<T>;
	name: Path<T>;
	placeholder: string;
	type?: string;
}

const AuthTextField = <T extends FieldValues>({
	control,
	name,
	placeholder,
	type
}: Props<T>) => (
	<FormField
		control={control}
		name={name}
		render={({ field }) => (
			<FormItem>
				<FormControl>
					<Input type={type} placeholder={placeholder} {...field} />
				</FormControl>
				<FormMessage />
			</FormItem>
		)}
	/>
);

export default AuthTextField;
