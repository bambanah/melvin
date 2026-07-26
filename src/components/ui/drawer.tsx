// A bottom drawer on Base UI's drawer primitive: swipe-to-dismiss, a grab
// handle, and rubber-band bleed come from the primitive, while the surface
// borrows Dialog's tokens so the two read as one component across
// breakpoints (see ResponsiveDialog, which picks between them). Side panels
// stay in Sheet - this one only ever comes up from the bottom edge.
import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";

import { cn } from "@/lib/utils";

const Drawer = (props: DrawerPrimitive.Root.Props) => (
	<DrawerPrimitive.Root data-slot="drawer" swipeDirection="down" {...props} />
);

const DrawerTrigger = (props: DrawerPrimitive.Trigger.Props) => (
	<DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
);

const DrawerClose = (props: DrawerPrimitive.Close.Props) => (
	<DrawerPrimitive.Close data-slot="drawer-close" {...props} />
);

const DrawerOverlay = ({
	className,
	...props
}: DrawerPrimitive.Backdrop.Props) => (
	<DrawerPrimitive.Backdrop
		data-slot="drawer-overlay"
		className={cn(
			// Fades with the drag so the page shows through as the drawer is
			// pushed away, then finishes at the speed it was flicked.
			"fixed inset-0 z-50 bg-black/80 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] select-none",
			"data-ending-style:pointer-events-none data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0",
			className
		)}
		{...props}
	/>
);

const DrawerSwipeHandle = ({
	className,
	...props
}: React.ComponentProps<"div">) => (
	<div
		data-slot="drawer-swipe-handle"
		aria-hidden="true"
		className={cn(
			"flex shrink-0 cursor-grab justify-center pt-3 pb-1 active:cursor-grabbing",
			className
		)}
		{...props}
	>
		<div className="bg-muted-foreground/30 h-1.5 w-10 rounded-full" />
	</div>
);

const DrawerContent = ({
	className,
	children,
	...props
}: DrawerPrimitive.Popup.Props) => (
	<DrawerPrimitive.Portal data-slot="drawer-portal">
		<DrawerOverlay />
		<DrawerPrimitive.Viewport
			data-slot="drawer-viewport"
			className="pointer-events-none fixed inset-0 z-50 select-none"
		>
			<DrawerPrimitive.Popup
				data-slot="drawer-popup"
				className={cn(
					"bg-background pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-4rem)] origin-bottom flex-col rounded-t-xl border-t shadow-lg outline-none select-none",
					// The drag follows the finger; enter and exit park the surface
					// just past the bottom edge.
					"transform-[translate3d(0,var(--drawer-swipe-movement-y,0px),0)] transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform",
					"data-ending-style:transform-[translate3d(0,calc(100%+2px),0)] data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] data-starting-style:transform-[translate3d(0,calc(100%+2px),0)] data-swiping:duration-0",
					// Bleed below the surface so an over-drag past the snap point
					// never flashes the page underneath.
					"after:bg-background after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-24",
					className
				)}
				{...props}
			>
				<DrawerSwipeHandle />
				<DrawerPrimitive.Content
					data-slot="drawer-content"
					className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] select-text"
				>
					{children}
				</DrawerPrimitive.Content>
			</DrawerPrimitive.Popup>
		</DrawerPrimitive.Viewport>
	</DrawerPrimitive.Portal>
);

const DrawerHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div
		data-slot="drawer-header"
		className={cn("flex shrink-0 flex-col space-y-1.5 text-center", className)}
		{...props}
	/>
);

const DrawerFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div
		data-slot="drawer-footer"
		className={cn("mt-auto flex shrink-0 flex-col gap-2", className)}
		{...props}
	/>
);

const DrawerTitle = ({ className, ...props }: DrawerPrimitive.Title.Props) => (
	<DrawerPrimitive.Title
		data-slot="drawer-title"
		className={cn(
			"text-lg leading-none font-semibold tracking-tight",
			className
		)}
		{...props}
	/>
);

const DrawerDescription = ({
	className,
	...props
}: DrawerPrimitive.Description.Props) => (
	<DrawerPrimitive.Description
		data-slot="drawer-description"
		className={cn("text-muted-foreground text-sm", className)}
		{...props}
	/>
);

export {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerSwipeHandle,
	DrawerTitle,
	DrawerTrigger
};
