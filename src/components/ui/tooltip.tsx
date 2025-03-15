import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

const Tooltip = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
		title: string;
	}
>(({ className, children, title, sideOffset = 4, ...props }, ref) => (
	<TooltipPrimitive.Provider>
		<TooltipPrimitive.Root>
			<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
			<TooltipPrimitive.Content
				ref={ref}
				sideOffset={sideOffset}
				className={cn(
					"bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md",
					className
				)}
				{...props}
			>
				<p>{title}</p>
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Root>
	</TooltipPrimitive.Provider>
));
Tooltip.displayName = "Tooltip";

export default Tooltip;
