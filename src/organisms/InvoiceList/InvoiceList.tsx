import Title from "@atoms/Title";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Activity, Client, Invoice } from "@prisma/client";
import dayjs from "dayjs";
import Link from "next/link";
import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import * as Styles from "./InvoiceList.styles";
import PdfDocument from "@molecules/PdfDocument";
import { toast } from "react-toastify";
import Button from "@atoms/Button";
import axios from "axios";
import { saveAs } from "file-saver";

const getInvoices = async () => {
	const response = await fetch("/api/invoices");

	return (await response.json()) as (Invoice & {
		activities: Activity[];
		client: Client;
	})[];
};

const savePdf = (invoiceId: string) => {
	axios
		.get(`/api/invoices/generate-pdf?invoiceId=${invoiceId}`)
		.then((res) => {
			const pdf = Buffer.from(res.data, "base64");
			const blob = new Blob([pdf], { type: "application/pdf" });

			const matches = res.headers["content-disposition"].match(/\"(.*?)\"/);
			const fileName = matches ? matches[0] : "generated.pdf";

			saveAs(blob, fileName);
		})
		.catch((err) => {
			console.error(err);
			toast.error("An unknown error occured");
		});
};

export default function InvoiceList() {
	const { data: invoices, error } = useSWR("/api/invoices", getInvoices);

	const [expandedInvoice, expandInvoice] = useState<number | undefined>(
		undefined
	);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}
	if (!invoices) return <div>loading...</div>;

	return (
		<Styles.Container>
			<Styles.Header>
				<Title>Invoices</Title>
				<Link href="/invoices/create" passHref>
					<Button primary>
						<FontAwesomeIcon icon={["fas", "plus"]} />
					</Button>
				</Link>
			</Styles.Header>
			{invoices.map((invoice, index) => (
				<Styles.InvoiceContainer
					className={expandedInvoice === index ? "expanded" : ""}
					key={invoice.id}
				>
					<Styles.Invoice>
						<div
							onClick={() =>
								expandInvoice(expandedInvoice === index ? undefined : index)
							}
						>
							<Styles.Expander>
								<FontAwesomeIcon icon={["fas", "chevron-right"]} size="2x" />
							</Styles.Expander>
							<Styles.Column>
								<h2>{invoice.invoiceNo}</h2>
								<span>{dayjs(invoice.date).format("DD/MM/YYYY")}</span>
							</Styles.Column>

							<Styles.Column>
								<span>
									<b>{invoice.client.name}</b>
								</span>
								<span>$1234.56</span>
							</Styles.Column>
						</div>

						<Styles.Actions>
							<a onClick={() => savePdf(invoice.id)}>
								<FontAwesomeIcon icon={["fas", "download"]} size="lg" />
							</a>
							<Styles.OptionsMenu tabIndex={0}>
								<FontAwesomeIcon icon={["fas", "ellipsis-v"]} size="lg" />
								<div className="dropdown">
									<Link href={`/invoices/${invoice.id}`}>View</Link>
									<Link href={`/invoices/${invoice.id}?edit=true`}>Edit</Link>
									<a
										onClick={() => {
											axios
												.delete(`/api/invoices/${invoice.id}`)
												.then((res) => {
													mutate("/api/invoices");
													toast.success(res);
												})
												.catch((err) => toast.error(err));
										}}
									>
										Delete
									</a>
								</div>
							</Styles.OptionsMenu>
						</Styles.Actions>
					</Styles.Invoice>
					{expandedInvoice === index && (
						<Styles.PdfPreview>
							<PdfDocument invoiceNo={invoice.id} />
						</Styles.PdfPreview>
					)}
				</Styles.InvoiceContainer>
			))}
		</Styles.Container>
	);
}
