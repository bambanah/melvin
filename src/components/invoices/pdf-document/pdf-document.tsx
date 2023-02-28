import Loading from "@atoms/loading";
import { trpc } from "@utils/trpc";
import { FC } from "react";
import { Document as MyDocument, Page } from "react-pdf";
import { SizeMe } from "react-sizeme";
import * as Styles from "./styles";

interface PdfProps {
	invoiceId: string;
}

const PdfDocument: FC<PdfProps> = ({ invoiceId }) => {
	const pdf = trpc.pdf.forInvoice.useQuery({ invoiceId, returnBase64: true });

	if (pdf.error) {
		console.error(pdf.error);
		return <div>Error loading</div>;
	}

	if (!pdf.data) return <Loading />;

	return (
		<Styles.Container>
			<SizeMe refreshRate={128} refreshMode={"debounce"}>
				{({ size }) => (
					<MyDocument file={pdf.data}>
						<Page pageNumber={1} width={size.width ?? 800} />
					</MyDocument>
				)}
			</SizeMe>
		</Styles.Container>
	);
};

export default PdfDocument;
