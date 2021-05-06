import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import CreateInvoice from './components/CreateInvoice';
import InvoiceList from './components/InvoiceList';
import Button from './shared/components/Button';
import ButtonGroup from './shared/components/ButtonGroup';
import { useAuth } from './shared/hooks/use-auth';
import { getTemplates, signOut } from './shared/utils/firebase';
import { Invoice, TemplateObject } from './shared/types';

export default function Home() {
	const [creating, setCreating] = useState(false);
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [templates, setTemplates] = useState<TemplateObject | null>(null);
	const [loaded, setLoaded] = useState(false);
	const auth = useAuth();

	useEffect(() => {
		getTemplates().then((res) => {
			setTemplates(res);
			setLoaded(true);
		});
	}, []);

	// Set creating whenever an invoice is added
	useEffect(() => {
		setCreating(true);
	}, [invoice]);

	const CreateInvoiceButton = () => (
		<Button
			className="button is-primary"
			onClick={() => setCreating(!creating)}
		>
			Create Invoice
		</Button>
	);

	const UseTemplateButton = () => {
		const [showModal, toggleModal] = useState(false);

		if (templates !== null) {
			if (showModal) {
				return (
					<div className={`modal ${showModal && 'is-active'}`}>
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
				<Button
					className="button is-outlined"
					onClick={() => toggleModal(true)}
				>
					Load from Template
				</Button>
			);
		}

		return <div>Loading...</div>;
	};

	const CreateInvoiceSection = styled.div`
		background-color: #f1f1f1;

		padding: 1.5rem;
		border-radius: 4px;
		box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
	`;

	return loaded ? (
		<section className="section">
			<div className="container">
				<div className="is-flex is-flex-direction-row is-justify-content-space-between 	">
					<h1 className="title">Invoices</h1>
					<div className="is-flex is-flex-direction-row ">
						{auth.user && <span className="mr-2 mt-2">{auth.user.email}</span>}
						<Button onClick={() => signOut()}>Log Out</Button>
					</div>
				</div>

				<CreateInvoiceSection className={`section ${creating && 'expanded'}`}>
					{creating ? (
						<CreateInvoice invoiceToLoad={invoice} setCreating={setCreating} />
					) : (
						<ButtonGroup>
							<CreateInvoiceButton />
							<UseTemplateButton />
						</ButtonGroup>
					)}
				</CreateInvoiceSection>

				<div className="section">
					<InvoiceList setInvoice={setInvoice} />
				</div>
			</div>
		</section>
	) : null;
}
