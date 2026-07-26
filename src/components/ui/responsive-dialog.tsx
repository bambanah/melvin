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
import { createContext, useContext, type ReactNode } from "react";

// Which primitive the surrounding root chose. The parts read it rather than
// calling useIsMobile again so a resize mid-flow can never split a single
// modal across both primitives.
const DrawerVariant = createContext(false);

const useDrawerVariant = () => useContext(DrawerVariant);

type Part = { className?: string; children?: ReactNode };

function ResponsiveDialog({
	open,
	onOpenChange,
	children
}: {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: ReactNode;
}) {
	const isMobile = useIsMobile();
	// Radix hands the callback one argument, Base UI two - normalise to the
	// boolean both agree on.
	const change = (next: boolean) => onOpenChange?.(next);

	return (
		<DrawerVariant.Provider value={isMobile}>
			{isMobile ? (
				<Drawer open={open} onOpenChange={change}>
					{children}
				</Drawer>
			) : (
				<Dialog open={open} onOpenChange={change}>
					{children}
				</Dialog>
			)}
		</DrawerVariant.Provider>
	);
}

function ResponsiveDialogContent({ className, children }: Part) {
	const isDrawer = useDrawerVariant();

	if (isDrawer) {
		return <DrawerContent className={className}>{children}</DrawerContent>;
	}

	// Capture flows are a phone-shaped column of one or two fields; the desktop
	// dialog holds that width instead of stretching to Dialog's default.
	return (
		<DialogContent className={cn("max-w-sm", className)}>
			{children}
		</DialogContent>
	);
}

function ResponsiveDialogHeader({ className, children }: Part) {
	const isDrawer = useDrawerVariant();

	if (isDrawer) {
		return <DrawerHeader className={className}>{children}</DrawerHeader>;
	}

	return <DialogHeader className={className}>{children}</DialogHeader>;
}

function ResponsiveDialogFooter({ className, children }: Part) {
	const isDrawer = useDrawerVariant();

	if (isDrawer) {
		return <DrawerFooter className={className}>{children}</DrawerFooter>;
	}

	return <DialogFooter className={className}>{children}</DialogFooter>;
}

function ResponsiveDialogTitle({ className, children }: Part) {
	const isDrawer = useDrawerVariant();

	if (isDrawer) {
		return <DrawerTitle className={className}>{children}</DrawerTitle>;
	}

	return <DialogTitle className={className}>{children}</DialogTitle>;
}

function ResponsiveDialogDescription({ className, children }: Part) {
	const isDrawer = useDrawerVariant();

	if (isDrawer) {
		return (
			<DrawerDescription className={className}>{children}</DrawerDescription>
		);
	}

	return (
		<DialogDescription className={className}>{children}</DialogDescription>
	);
}

export {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle
};
