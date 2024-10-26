import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { decimalToCurrencyString } from "@/lib/utils";

interface Props {
	clientId: string;
}

const CustomRatesTable = ({ clientId }: Props) => {
	const { data: customRates } =
		trpc.supportItem.getCustomRatesForClient.useQuery({ id: clientId });

	if (!customRates || customRates.length === 0) return null;

	return (
		<Table className="mb-4">
			<TableHeader>
				<TableRow>
					<TableHead className="p-2">Support Item</TableHead>
					<TableHead className="p-2">Daytime</TableHead>
					<TableHead className="p-2">Evening</TableHead>
					<TableHead className="p-2">Saturday</TableHead>
					<TableHead className="p-2">Sunday</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{customRates.map((rate) => (
					<TableRow key={rate.id}>
						<TableCell className="p-2">
							{rate.supportItem.description}
						</TableCell>
						<TableCell className="p-2">
							{rate.weekdayRate && decimalToCurrencyString(rate.weekdayRate)}
						</TableCell>
						<TableCell className="p-2">
							{rate.weeknightRate &&
								decimalToCurrencyString(rate.weeknightRate)}
						</TableCell>
						<TableCell className="p-2">
							{rate.saturdayRate && decimalToCurrencyString(rate.saturdayRate)}
						</TableCell>
						<TableCell className="p-2">
							{rate.sundayRate && decimalToCurrencyString(rate.sundayRate)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
};

export default CustomRatesTable;
