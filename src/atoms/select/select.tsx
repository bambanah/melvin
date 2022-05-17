import { useField } from "formik";
import React from "react";
import ReactSelect from "react-select";
import { useTheme } from "styled-components";
import { lighten, shade } from "polished";

interface SelectProps {
	error?: boolean;
	handleChange?: () => void;
	options: { value: string; label: string }[];
	name: string;
}

const Select = ({
	name,
	options,
	error,
}: React.HTMLProps<HTMLSelectElement> & SelectProps) => {
	// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
	const [field, _meta, helpers] = useField(name);

	const theme = useTheme();

	return (
		<ReactSelect
			name={name}
			className="react-select"
			value={
				options
					? options.find((option) => option.value === field.value)
					: undefined
			}
			options={options}
			onChange={(option) => {
				helpers.setValue(option?.value);
			}}
			onBlur={field.onBlur}
			styles={{
				control: (styles) => ({
					...styles,
					borderColor: error ? theme.colors.error : styles.borderColor,
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
};

export default Select;
