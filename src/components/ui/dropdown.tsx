import { cn } from "@/lib/utils";
import { Menu } from "@headlessui/react";
import { HTMLAttributes, ReactNode } from "react";

const DropdownButton = ({
	children,
	className,
	...rest
}: HTMLAttributes<HTMLButtonElement>) => (
	<Menu.Button
		className={cn(["px-4 py-2 text-xl hover:bg-neutral-100", className])}
		{...rest}
	>
		{children}
	</Menu.Button>
);

const DropdownItems = ({ children }: { children: ReactNode }) => (
	<Menu.Items className="absolute right-0 flex w-40 origin-top-right flex-col bg-zinc-50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
			className={cn(["relative inline-block", className])}
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
