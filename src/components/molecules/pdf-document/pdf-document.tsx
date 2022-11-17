import Loading from "@atoms/loading";
import axios from "axios";
import { FC } from "react";
import { Document as MyDocument, Page, pdfjs } from "react-pdf";
import { SizeMe } from "react-sizeme";
import useSWR from "swr";
import * as Styles from "./styles";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfProps {
	invoiceId: string;
}

const fetchInvoice = (invoiceId: string) =>
	axios
		.get(`/api/invoices/generate-pdf/${invoiceId}`, {
			params: { base64: true },
		})
		.then((response) => {
			return `data:application/pdf;base64,${response.data}`;
		});

const PdfDocument: FC<PdfProps> = ({ invoiceId }) => {
	const { data: pdf, error } = useSWR(
		`/api/invoices/generate-pdf/${invoiceId}`,
		() => fetchInvoice(invoiceId)
	);

	if (error) {
		console.error(error);
		return <div>Error loading</div>;
	}

	if (!pdf) return <Loading />;

	return (
		<Styles.Container>
			<SizeMe refreshRate={128} refreshMode={"debounce"}>
				{({ size }) => (
					<MyDocument file={pdf}>
						<Page pageNumber={1} width={size.width ?? 800} />
					</MyDocument>
				)}
			</SizeMe>
		</Styles.Container>
	);
};

export default PdfDocument;
