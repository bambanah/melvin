import Loading from "@atoms/loading";
import { trpc } from "@utils/trpc";
import { FC } from "react";
import { Document as MyDocument, Page } from "react-pdf";
import { SizeMe } from "react-sizeme";

interface PdfProps {
	invoiceId: string;
}

const PdfPreview: FC<PdfProps> = ({ invoiceId }) => {
	const pdf = trpc.pdf.forInvoice.useQuery({ invoiceId, returnBase64: true });

	if (pdf.error) {
		console.error(pdf.error);
		return <div>Error loading</div>;
	}

	if (!pdf.data) return <Loading />;

	return (
		<div className="[.react-pdf__Page__svg]:m-auto [.react-pdf__Page__svg]:w-full">
			<SizeMe refreshRate={128} refreshMode={"debounce"}>
				{({ size }) => (
					<MyDocument file={pdf.data}>
						<Page pageNumber={1} width={size.width ?? 800} />
					</MyDocument>
				)}
			</SizeMe>
		</div>
	);
};

export default PdfPreview;
