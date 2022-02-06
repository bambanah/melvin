import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import dayjs from "dayjs";
import Link from "next/link";
import React, { useState } from "react";
import * as Styles from "./styles";
import PdfDocument from "@molecules/pdf-document";
import { toast } from "react-toastify";
import Button from "@atoms/button";
import axios from "axios";
import { saveAs } from "file-saver";
import useSWR, { useSWRConfig } from "swr";
import { getTotalCost } from "@utils/helpers";
import { Invoice } from "types/invoice";
import Display from "@atoms/display";

const getInvoices = async () => {
	const response = await fetch("/api/invoices");
	return (await response.json()) as Invoice[];
};

const savePdf = (invoiceId: string) => {
	axios
		.get(`/api/invoices/generate-pdf?invoiceId=${invoiceId}`)
		.then((response) => {
			const pdf = Buffer.from(response.data, "base64");
			const blob = new Blob([pdf], { type: "application/pdf" });

			const matches = response.headers["content-disposition"].match(/"(.*?)"/);
			const fileName = matches ? matches[0] : "generated.pdf";

			saveAs(blob, fileName);
		})
		.catch((error) => {
			console.error(error);
			toast.error("An unknown error occured");
		});
};

export default function InvoiceList() {
	const { mutate } = useSWRConfig();
	const { data: invoices, error } = useSWR("/api/invoices", getInvoices);

	const [expandedInvoice, expandInvoice] = useState<number | undefined>();

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoices) return <div>loading...</div>;

	const PdfPreview = ({ index }: { index: number }) => (
		<PdfDocument invoiceId={invoices[index].id} />
	);

	return (
		<Styles.Container>
			<Styles.Header>
				<Display className="small">Invoices</Display>
				<Link href="/invoices/create" passHref>
					<Button primary>+ Add New</Button>
				</Link>
			</Styles.Header>
			<Styles.InvoiceContainer>
				{invoices.map((invoice, index) => (
					<Styles.Invoice
						key={invoice.id}
						className={expandedInvoice === index ? "expanded" : ""}
					>
						<Styles.InvoiceDetails
							onClick={() =>
								expandInvoice(expandedInvoice === index ? undefined : index)
							}
						>
							<div>
								<FontAwesomeIcon icon={["fas", "chevron-right"]} size="1x" />
							</div>
							<span className="date">
								{dayjs(invoice.date).format("DD/MM/YY")}
							</span>
							<h2>{invoice.invoiceNo}</h2>
							<span className="name">{invoice.client?.name}</span>
							{/* <div
								className={`status ${invoice.status.toLowerCase()}`}
								onClick={(e) => e.stopPropagation()}
							>
								<FontAwesomeIcon icon={["fas", "circle"]} />{" "}
								{invoice.status.slice(0, 1) +
									invoice.status.slice(1).toLowerCase()}
								<div>
									<span>Created</span>
									<span>Sent</span>
									<span>Paid</span>
								</div>
							</div> */}
							<span className="total">
								$
								{getTotalCost(invoice.activities).toLocaleString(undefined, {
									minimumFractionDigits: 2,
								})}
							</span>
						</Styles.InvoiceDetails>
						<Styles.Actions
							className={expandedInvoice === index ? "expanded" : ""}
						>
							<Link href={`/invoices/${invoice.id}?edit=true`}>
								<a>
									<FontAwesomeIcon icon={["fas", "edit"]} size="sm" />
									Edit
								</a>
							</Link>
							<Link href={`/invoices/create?copyFrom=${invoice.id}`}>
								<a>
									<FontAwesomeIcon icon={["fas", "copy"]} size="sm" />
									Copy
								</a>
							</Link>
							<a onClick={() => savePdf(invoice.id)}>
								<FontAwesomeIcon icon={["fas", "download"]} size="sm" />
								Download
							</a>
							<a
								onClick={() => {
									if (
										confirm(
											`Are you sure you want to delete ${invoice.invoiceNo}?`
										)
									) {
										axios
											.delete(`/api/invoices/${invoice.id}`)
											.then((response) => {
												mutate("/api/invoices");
												toast.success(response);
											})
											.catch((error_) => toast.error(error_));
									}
								}}
							>
								<FontAwesomeIcon icon={["fas", "trash"]} size="sm" />
								Delete
							</a>
						</Styles.Actions>
						<Styles.PdfPreview
							className={expandedInvoice === index ? "expanded" : ""}
						>
							{expandedInvoice !== undefined && <PdfPreview index={index} />}
						</Styles.PdfPreview>
					</Styles.Invoice>
				))}
			</Styles.InvoiceContainer>
		</Styles.Container>
	);
}
