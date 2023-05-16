import classNames from "classnames";

interface ErrorProps {
	error?: string;
	className?: string;
}

const ErrorMessage = ({ error, className }: ErrorProps) => {
	return (
		<p
			className={classNames([
				"mb-0 text-sm text-red-500 transition-all duration-100 ease-in-out",
				error ? "mt-1 max-h-4" : "max-h-0",
				className,
			])}
		>
			{error ?? <br />}
		</p>
	);
};

export default ErrorMessage;
