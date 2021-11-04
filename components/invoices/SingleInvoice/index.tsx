import { Activity, Client, Invoice } from "@prisma/client";
import { getTotalString } from "@Shared/utils/helpers";
import axios from "axios";
import moment from "moment";
import React, {
	useEffect, useState
} from "react";
import { toast } from "react-toastify";
import { Action, Actions, InvoiceRow, TableCell } from "./styles";

const deleteInvoice = async (invoiceId: string) => {
	await axios.delete(`http://localhost:3000/${invoiceId}`).then(() => {
		toast.success("Invoice deleted")
	});
};

const generatePdf = async (invoiceId: string) => {
	return invoiceId;
}

const SingleInvoice = ({
	invoice,
}: {
	invoice: Invoice & {
		activities: Activity[];
		client: Client;
	};
}) => {
	const [cost, setTotalCost] = useState<null | string>(null);

	useEffect(() => {
		getTotalString(invoice.id).then((costString) => setTotalCost(costString));
	}, [invoice]);

	return (
		<InvoiceRow>
			<TableCell>{invoice.invoiceNo}</TableCell>
			<TableCell>{moment(invoice.date).format("DD-MM-yyyy")}</TableCell>
			<TableCell>
				{invoice.client?.firstName ?? "Unknown"} {invoice.client?.lastName ?? "Name"}
			</TableCell>
			<TableCell>{invoice.activities?.length ?? 2}</TableCell>

			<TableCell>{cost}</TableCell>
			<TableCell>
				<Actions>
					<Action onClick={() => {}} icon="edit" size="lg" />
					<Action onClick={() => {}} icon="copy" size="lg" />
					<Action
						onClick={() => generatePdf(invoice.id)}
						icon="file-download"
						size="lg"
					/>
					<Action
						onClick={() => {
							deleteInvoice(invoice.id);
						}}
						icon="times"
						size="lg"
					/>
				</Actions>
			</TableCell>
		</InvoiceRow>
	);
};

export default SingleInvoice;
