import Button from "@atoms/Button";
import React from "react";

const CreateInvoice = ({
	setCreating,
}: {
	setCreating: (creating: boolean) => void;
}) => {
	return (
		<div>
			<p>Create Invoice Goes Here</p>
			<Button onClick={() => setCreating(false)}>Close</Button>
		</div>
	);
};

export default CreateInvoice;
