import { CustomRatesRow } from "@/components/clients/custom-rates-row";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

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
					<TableHead className="w-28 p-2"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{customRates.map((rate) => (
					<CustomRatesRow key={rate.id} clientId={clientId} rate={rate} />
				))}
			</TableBody>
		</Table>
	);
};

export default CustomRatesTable;
