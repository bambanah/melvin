import Loading from "@atoms/loading";
import axios from "axios";
import { FC, useEffect, useState } from "react";
import { Document as MyDocument, Page, pdfjs } from "react-pdf";
import { SizeMe } from "react-sizeme";
import * as Styles from "./styles";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfProps {
	invoiceId: string;
}

const PdfDocument: FC<PdfProps> = ({ invoiceId }) => {
	const [pdf, setPdf] = useState("");

	useEffect(() => {
		axios
			.get("/api/invoices/generate-pdf", {
				params: {
					invoiceId,
				},
			})
			.then((response) => {
				setPdf(`data:application/pdf;base64,${response.data}`);
			});
	}, [invoiceId]);

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
