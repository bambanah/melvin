import Loading from "@/components/ui/loading";
import { trpc } from "@/lib/trpc";
import { FC, useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";

import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfProps {
	invoiceId: string;
	className?: string;
}

const PdfPreview: FC<PdfProps> = ({ invoiceId, className }) => {
	const [numPages, setNumPages] = useState<number | null>(null);
	const [containerWidth, setContainerWidth] = useState(800);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const element = containerRef.current;
		if (!element || typeof ResizeObserver === "undefined") return;

		const observer = new ResizeObserver((entries) => {
			const nextWidth = entries[0]?.contentRect.width;
			if (nextWidth) setContainerWidth(Math.max(1, Math.floor(nextWidth)));
		});

		observer.observe(element);
		setContainerWidth(
			Math.max(1, Math.floor(element.getBoundingClientRect().width))
		);

		return () => observer.disconnect();
	}, []);

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
		<div ref={containerRef} className={className}>
			<Document file={pdf.data} onLoadSuccess={onDocumentLoadSuccess}>
				{numPages &&
					Array.from({ length: numPages }, (_, index) => (
						<Page
							key={index}
							pageNumber={index + 1}
							width={containerWidth}
							renderTextLayer={false}
							renderAnnotationLayer={false}
						/>
					))}
			</Document>
		</div>
	);
};

export default PdfPreview;
