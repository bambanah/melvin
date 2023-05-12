import classNames from "classnames";

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "success"
	| "danger"
	| "info"
	| "default";

const variantStyles: Record<ButtonVariant, string> = {
	primary: "btn-primary",
	secondary: "btn-secondary",
	success: "btn-success",
	danger: "btn-danger",
	info: "btn-info",
	default: "btn-default",
};

interface Props<T extends React.ElementType> {
	as?: T;
	variant?: ButtonVariant;
	children?: React.ReactNode;
}

const Button = <T extends React.ElementType>({
	className,
	as,
	variant = "default",
	...rest
}: Props<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof Props<T>>) => {
	const Component = as || "button";

	return (
		<Component
			className={classNames([
				`btn-base hover:btn-raised`,
				variantStyles[variant],
				className,
			])}
			{...rest}
		/>
	);
};

export default Button;
