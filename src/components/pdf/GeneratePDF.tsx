import Button from "../../shared/components/Button";
import { generatePDF } from "../../shared/utils/pdf-generation";
import { Invoice } from "../../types";

export default function GeneratePDF({ invoice }: { invoice: Invoice }) {
	return (
		<div>
			<Button onClick={() => generatePDF(invoice)}>Generate PDF</Button>
		</div>
	);
}
