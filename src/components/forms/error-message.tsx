interface ErrorProps {
	error?: string;
}

const ErrorMessage = ({ error }: ErrorProps) => {
	if (!error) return <></>;

	return <p className="mt-1 mb-0 h-4 text-sm text-red-500">{error}</p>;
};

export default ErrorMessage;
