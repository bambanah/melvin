import React, { useState } from "react";
import Button from "../../shared/components/Button";
import { Invoice } from "../../shared/types";
import { createTemplateFromInvoice } from "../../shared/utils/helpers";

export default function SaveAsTemplateButton({ values }: { values: Invoice }) {
	const [show, setShow] = useState(false);

	const handleClick = () => {
		createTemplateFromInvoice(values);
	};

	return (
		<>
			<p className="control">
				<Button className="is-outlined" onClick={() => setShow(true)}>
					Save as Template
				</Button>
			</p>
			<div className={`modal ${show && "is-active"}`}>
				<div
					className="modal-background"
					onClick={() => setShow(false)}
					role="presentation"
				/>
				<div className="modal-content card">
					<Button onClick={handleClick}>Create</Button>
				</div>
			</div>
		</>
	);
}
