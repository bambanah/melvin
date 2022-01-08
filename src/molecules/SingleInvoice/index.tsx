import { Activity, Client, Invoice } from "@prisma/client";
import { getTotalString } from "@utils/helpers";
import moment from "moment";
import React, { useEffect, useState } from "react";
import * as Styles from "./styles";

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
			<Styles.TableCell>
				{moment(invoice.date).format("DD-MM-yyyy")}
			</Styles.TableCell>
			<Styles.TableCell>
				{invoice.client?.name ?? "Unknown Name"}
			</Styles.TableCell>
			<Styles.TableCell>{invoice.activities?.length ?? 2}</Styles.TableCell>

			<Styles.TableCell>{cost}</Styles.TableCell>
		</Styles.InvoiceRow>
	);
};

export default SingleInvoice;
