import {
	FieldValues,
	Path,
	PathValue,
	useController,
	UseControllerProps,
} from "react-hook-form";
import ReactSelect from "react-select";

interface SelectProps<T extends FieldValues>
	extends Omit<UseControllerProps<T>, "defaultValue"> {
	options: {
		value: string;
		label: string | JSX.Element;
	}[];
}

function Select<T extends FieldValues>({ options, ...rest }: SelectProps<T>) {
	const {
		field: { onChange, value, name },
	} = useController(rest);

	return (
		<ReactSelect
			name={name}
			className="react-select w-full min-w-0"
			unstyled
			options={options}
			value={options.find((c) => c.value === value)}
			onChange={(val) => onChange(val?.value as PathValue<T, Path<T>>)}
			classNames={{
				control: () =>
					"p-3 border w-full bg-white shadow-md rounded-md focus-within:border-orange-500 outline-none cursor-pointer",
				option: (state) =>
					state.isFocused
						? "bg-orange-200 rounded-none p-2 last:rounded-b-md border-t"
						: "p-2 border-t",
				menu: () =>
					"rounded-none shadow-lg border border-t-none rounded-b-md bg-white",
			}}
			styles={{
				control: (styles) => ({
					...styles,
					cursor: "pointer",
				}),
				singleValue: (styles) => ({
					...styles,
					whiteSpace: "nowrap",
				}),
			}}
		/>
	);
}

export default Select;
