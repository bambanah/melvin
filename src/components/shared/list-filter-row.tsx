import classNames from "classnames";
import { HTMLAttributes } from "react";

interface Props {
	items: ({ active?: boolean } & HTMLAttributes<HTMLButtonElement>)[];
}

const ListFilterRow = ({ items }: Props) => {
	return (
		<div className="w-full border-b">
			<div className="-mb-[1px] flex w-full md:max-w-xs">
				{items.map(({ className, active, ...rest }, idx) => (
					<button
						key={idx}
						type="button"
						className={classNames([
							"basis-1/2 border-b px-4 py-2 text-center transition-all",
							className,
							active && "border-orange-700 text-orange-700",
						])}
						{...rest}
					/>
				))}
			</div>
		</div>
	);
};

export default ListFilterRow;
