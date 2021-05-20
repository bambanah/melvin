import React, { useEffect, useState } from "react";
import Button from "../../shared/components/Button";
import { Invoice, TemplateObject } from "../../shared/types";
import { getTemplates } from "../../shared/utils/firebase";

const TemplateList = ({
	setInvoice,
}: {
	setInvoice: (invoice: Invoice) => void;
}) => {
	const [showModal, toggleModal] = useState(false);
	const [templates, setTemplates] = useState<TemplateObject | null>(null);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		getTemplates().then((res) => {
			setTemplates(res);
			setLoaded(true);
		});
	}, []);

	if (templates !== null && loaded) {
		if (showModal) {
			return (
				<div className={`modal ${showModal && "is-active"}`}>
					<div
						className="modal-background"
						role="presentation"
						onClick={() => toggleModal(false)}
					/>
					<div className="modal-content card">
						<ul>
							{Object.entries(templates).map(([templateId, template]) => (
								<li key={templateId}>
									<Button onClick={() => setInvoice(template)}>
										{template.template_name}
									</Button>
								</li>
							))}
						</ul>
					</div>
				</div>
			);
		}
		return (
			<Button className="is-outlined" onClick={() => toggleModal(true)}>
				Load from Template
			</Button>
		);
	}

	return <div>Loading templates...</div>;
};

export default TemplateList;
