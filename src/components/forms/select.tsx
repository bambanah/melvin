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
		fieldState,
	} = useController(rest);

	return (
		<ReactSelect
			name={name}
			className="react-select"
			options={options}
			value={options.find((c) => c.value === value)}
			onChange={(val) => onChange(val?.value)}
			styles={{
				control: (styles) => ({
					...styles,
					borderColor:
						fieldState.error && fieldState.isTouched
							? "#f86d6d"
							: styles.borderColor,
					cursor: "pointer",
					borderRadius: 0,
				}),
				option: (styles) => ({
					...styles,
					borderRadius: 0,
				}),
				menu: (styles) => ({
					...styles,
					borderRadius: 0,
				}),
			}}
			theme={(selectTheme) => ({
				...selectTheme,
				colors: {
					...selectTheme.colors,
				},
			})}
		/>
	);
}

export default Select;
