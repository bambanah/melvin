import Loading from "@/components/ui/loading";
import { trpc } from "@/lib/trpc";
import { FC, useState } from "react";
import { Document, Page } from "react-pdf";
import { SizeMe } from "react-sizeme";

import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfProps {
	invoiceId: string;
	className?: string;
}

const PdfPreview: FC<PdfProps> = ({ invoiceId, className }) => {
	const [numPages, setNumPages] = useState<number | null>(null);

	const onDocumentLoadSuccess = ({
		numPages: nextNumPages
	}: {
		numPages: number;
	}) => {
		setNumPages(nextNumPages);
	};

	const pdf = trpc.pdf.forInvoice.useQuery({ invoiceId, returnBase64: true });
	if (pdf.error) {
		console.error(pdf.error);
		return <div>Error loading</div>;
	}

	if (!pdf.data) return <Loading />;

	return (
		<div className={className}>
			<SizeMe>
				{({ size }) => (
					<Document file={pdf.data} onLoadSuccess={onDocumentLoadSuccess}>
						{numPages &&
							Array.from({ length: numPages }, (_, index) => (
								<Page
									key={index}
									pageNumber={index + 1}
									width={size.width ?? 800}
									renderTextLayer={false}
									renderAnnotationLayer={false}
								/>
							))}
					</Document>
				)}
			</SizeMe>
		</div>
	);
};

export default PdfPreview;
