import { lighten, shade } from "polished";
import {
	FieldValues,
	useController,
	UseControllerProps,
} from "react-hook-form";
import ReactSelect from "react-select";
import { useTheme } from "styled-components";

interface SelectProps<T extends FieldValues> extends UseControllerProps<T> {
	options: {
		value: string;
		label: string;
	}[];
}

function Select<T extends FieldValues>({ options, ...rest }: SelectProps<T>) {
	const theme = useTheme();

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
							? theme.colors.error
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
					primary: theme.colors.link,
					primary25:
						theme.type === "light"
							? lighten(0.4, theme.colors.link)
							: shade(0.4, theme.colors.link),
					neutral70: theme.colors.fg,
					neutral80: theme.colors.fg,
					neutral90: theme.colors.fg,
					neutral0: theme.colors.bg,
				},
			})}
		/>
	);
}

export default Select;
