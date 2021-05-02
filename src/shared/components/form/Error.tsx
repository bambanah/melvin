import React from "react";

interface ErrorProps {
	error: string | undefined;
	touched: boolean | undefined;
}

const Error = ({ error, touched }: ErrorProps) => {
	if (error && touched) {
		return <p className="help is-danger">{error}</p>;
	}

	return null;
};

export default Error;
