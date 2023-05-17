import Button from "@components/atoms/button";
import { Dialog } from "@headlessui/react";
import { Dispatch, SetStateAction } from "react";

interface Props {
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	title?: string;
	description?: string;
	confirmAction: () => void;
	confirmText?: string;
	cancelText?: string;
}

const ConfirmDialog = ({
	isOpen,
	setIsOpen,
	title,
	description,
	confirmAction,
	confirmText,
	cancelText,
}: Props) => {
	return (
		<Dialog open={isOpen} onClose={() => setIsOpen(false)}>
			<div className="fixed inset-0 z-30 bg-black bg-opacity-25" />

			<div className="fixed inset-0 z-40 overflow-y-auto">
				<div className="flex min-h-full items-center justify-center p-4 text-center">
					<Dialog.Panel className="flex w-full max-w-lg transform flex-col gap-8 overflow-hidden rounded-md bg-neutral-50 p-6 text-left align-middle shadow-xl transition-all">
						<Dialog.Title as="h3" className="text-xl">
							{title ?? "Are you sure?"}
						</Dialog.Title>
						{description && (
							<p className="text-sm text-gray-500">{description}</p>
						)}

						<div className="flex gap-4 pt-2">
							<Button
								type="button"
								variant="danger"
								onClick={() => {
									confirmAction();
									setIsOpen(false);
								}}
							>
								{confirmText ?? "Yes"}
							</Button>
							<Button type="button" onClick={() => setIsOpen(false)}>
								{cancelText ?? "No"}
							</Button>
						</div>
					</Dialog.Panel>
				</div>
			</div>
		</Dialog>
	);
};

export default ConfirmDialog;
