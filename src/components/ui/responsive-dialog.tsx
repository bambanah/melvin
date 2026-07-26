// One modal that matches the device: a centered Dialog from `md` up, a bottom
// Drawer below it. Callers write the content once - the parts below pick the
// right primitive underneath, so a capture flow reaches for the thumb on a
// phone and the middle of the screen on a laptop without branching.
//
// The interface is deliberately narrower than either primitive (className and
// children only). Reach for Dialog or Drawer directly if you need more.
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import {
	createContext,
	useContext,
	type ComponentType,
	type ReactNode
} from "react";

// Which primitive the surrounding root chose, and whether the modal can be
// light-dismissed. The parts read it rather than calling useIsMobile again so
// a resize mid-flow can never split a single modal across both primitives.
const Variant = createContext({ drawer: false, dismissible: true });

type Part = { className?: string; children?: ReactNode };

/**
 * One part of the modal, in both flavours. `dialogClassName` carries whatever
 * the desktop primitive needs on top of its own defaults; the caller's own
 * className always lands last.
 */
function responsivePart(
	DrawerPart: ComponentType<Part>,
	DialogPart: ComponentType<Part>,
	dialogClassName?: string
) {
	const ResponsivePart = ({ className, children }: Part) =>
		useContext(Variant).drawer ? (
			<DrawerPart className={className}>{children}</DrawerPart>
		) : (
			<DialogPart className={cn(dialogClassName, className)}>
				{children}
			</DialogPart>
		);
	ResponsivePart.displayName = `Responsive${DialogPart.displayName ?? DialogPart.name}`;
	return ResponsivePart;
}

function ResponsiveDialog({
	open,
	onOpenChange,
	dismissible = true,
	children
}: {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/**
	 * `false` removes every light-dismiss route - Escape, outside press, the
	 * dialog's corner X, the drawer's swipe - so the modal only closes through
	 * one of its own actions. For questions that must be answered.
	 */
	dismissible?: boolean;
	children?: ReactNode;
}) {
	const isMobile = useIsMobile();
	// Radix hands the callback one argument, Base UI two - normalise to the
	// boolean both agree on. Both primitives are controlled by `open`, so a
	// non-dismissible modal simply never forwards their close requests.
	const change = dismissible
		? (next: boolean) => onOpenChange?.(next)
		: undefined;

	return (
		<Variant.Provider value={{ drawer: isMobile, dismissible }}>
			{isMobile ? (
				<Drawer
					open={open}
					onOpenChange={change}
					disablePointerDismissal={!dismissible}
				>
					{children}
				</Drawer>
			) : (
				<Dialog open={open} onOpenChange={change}>
					{children}
				</Dialog>
			)}
		</Variant.Provider>
	);
}

// Capture flows are a phone-shaped column of one or two fields; the desktop
// dialog holds that width instead of stretching to Dialog's default. Content
// is hand-rolled rather than a responsivePart because it also hides the
// close affordances (corner X, swipe handle) when the root is non-dismissible.
const ResponsiveDialogContent = ({ className, children }: Part) => {
	const { drawer, dismissible } = useContext(Variant);
	return drawer ? (
		<DrawerContent className={className} showHandle={dismissible}>
			{children}
		</DrawerContent>
	) : (
		<DialogContent
			className={cn("max-w-sm", className)}
			showCloseButton={dismissible}
		>
			{children}
		</DialogContent>
	);
};
const ResponsiveDialogHeader = responsivePart(DrawerHeader, DialogHeader);
const ResponsiveDialogFooter = responsivePart(DrawerFooter, DialogFooter);
const ResponsiveDialogTitle = responsivePart(DrawerTitle, DialogTitle);
const ResponsiveDialogDescription = responsivePart(
	DrawerDescription,
	DialogDescription
);

export {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle
};
