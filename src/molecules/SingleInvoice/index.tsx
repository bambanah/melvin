import { Activity, Client, Invoice } from "@prisma/client";
import { getTotalString } from "@utils/helpers";
import axios from "axios";
import moment from "moment";
import React, {
	useEffect, useState
} from "react";
import { toast } from "react-toastify";
import * as Styles from "./styles";

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
		<Styles.InvoiceRow>
			<Styles.TableCell>{invoice.invoiceNo}</Styles.TableCell>
			<Styles.TableCell>{moment(invoice.date).format("DD-MM-yyyy")}</Styles.TableCell>
			<Styles.TableCell>
				{invoice.client?.firstName ?? "Unknown"} {invoice.client?.lastName ?? "Name"}
			</Styles.TableCell>
			<Styles.TableCell>{invoice.activities?.length ?? 2}</Styles.TableCell>

			<Styles.TableCell>{cost}</Styles.TableCell>
			<Styles.TableCell>
				<Styles.Actions>
					<Styles.Action onClick={() => {}} icon="edit" size="lg" />
					<Styles.Action onClick={() => {}} icon="copy" size="lg" />
					<Styles.Action
						onClick={() => generatePdf(invoice.id)}
						icon="file-download"
						size="lg"
					/>
					<Styles.Action
						onClick={() => {
							deleteInvoice(invoice.id);
						}}
						icon="times"
						size="lg"
					/>
				</Styles.Actions>
			</Styles.TableCell>
		</Styles.InvoiceRow>
	);
};

export default SingleInvoice;
