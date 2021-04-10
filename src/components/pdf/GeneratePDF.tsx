
import { StyledButton } from "../../shared/components/Button/Styles";
import {generatePDF} from "../../shared/utils/pdf-generation";
import { Invoice } from "../../types";

export default function GeneratePDF({ invoice }: { invoice: Invoice }) {
	

	return (
		<div>
			<StyledButton onClick={() => generatePDF(invoice)} className="button is-info">
				Generate PDF
			</StyledButton>
		</div>
	);
}
