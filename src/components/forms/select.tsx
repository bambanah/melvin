import {
	FieldValues,
	useController,
	UseControllerProps,
} from "react-hook-form";
import ReactSelect from "react-select";

interface SelectProps<T extends FieldValues> extends UseControllerProps<T> {
	options: {
		value: string;
		label: string;
	}[];
}

function Select<T extends FieldValues>({ options, ...rest }: SelectProps<T>) {
	const {
		field: { onChange, value, name },
	} = useController(rest);

	return (
		<ReactSelect
			name={name}
			className="react-select"
			unstyled
			options={options}
			value={options.find((c) => c.value === value)}
			onChange={(val) => onChange(val?.value)}
			classNames={{
				control: () =>
					"p-3 border bg-white shadow-md rounded-md focus-within:border-indigo-500 outline-none cursor-pointer",
				option: (state) =>
					state.isFocused
						? "bg-indigo-200 rounded-none p-2 last:rounded-b-md"
						: "p-2",
				menu: () => "rounded-none shadow-md rounded-b-md bg-white",
			}}
			styles={{
				control: (styles) => ({
					...styles,
					cursor: "pointer",
				}),
			}}
		/>
	);
}

export default Select;
