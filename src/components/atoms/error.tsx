interface Props {
	errorMessage?: string;
}

const Error = ({ errorMessage }: Props) => {
	return (
		<>
			<div>An error occured. Oopsie!</div>
			{errorMessage && (
				<>
					<div>Here&#39;s the error message:</div>
					<span>{errorMessage}</span>
				</>
			)}
		</>
	);
};

export default Error;
