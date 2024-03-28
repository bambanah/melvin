interface Props {
	children: React.ReactNode | React.ReactNode[];
}

const AuthModal = ({ children }: Props) => {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="flex w-full max-w-xs flex-col items-center justify-items-stretch gap-8 p-4">
				{children}
			</div>
		</div>
	);
};

export default AuthModal;
