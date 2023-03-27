import { Menu } from "@headlessui/react";
import classNames from "classnames";
import { HTMLAttributes, ReactNode } from "react";

const DropdownButton = ({
	children,
	className,
	...rest
}: HTMLAttributes<HTMLButtonElement>) => (
	<Menu.Button
		className={classNames([
			"py-2 px-4 text-xl hover:bg-neutral-100",
			className,
		])}
		{...rest}
	>
		{children}
	</Menu.Button>
);

const DropdownItems = ({ children }: { children: ReactNode }) => (
	<Menu.Items className="absolute right-0 flex w-40 origin-top-right flex-col bg-slate-50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
		{children}
	</Menu.Items>
);

const DropdownItem = ({ children }: { children: ReactNode }) => (
	<Menu.Item>{children}</Menu.Item>
);

const Dropdown = ({
	children,
	className,
	...rest
}: HTMLAttributes<HTMLDivElement>) => {
	return (
		<Menu
			as="div"
			className={classNames(["relative inline-block", className])}
			{...rest}
		>
			{children}
		</Menu>
	);
};

export default Object.assign(Dropdown, {
	Button: DropdownButton,
	Items: DropdownItems,
	Item: DropdownItem,
});
