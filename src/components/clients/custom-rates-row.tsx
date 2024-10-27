import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { decimalToCurrencyString } from "@/lib/utils";
import { SupportItem, SupportItemRates } from "@prisma/client";
import { Check, Pencil, Trash, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface CustomRatesCellProps {
	value?: string;
	setValue: (value: string) => void;
}

function CustomRatesCell({ value, setValue }: CustomRatesCellProps) {
	return (
		<TableCell className="p-2">
			<span className="flex items-center gap-1">
				$
				<Input
					value={value}
					onChange={(e) => setValue(e.target.value)}
					className="h-min w-14 p-1"
				/>
			</span>
		</TableCell>
	);
}

interface CustomRatesRowProps {
	clientId: string;
	rate: SupportItemRates & { supportItem: Pick<SupportItem, "description"> };
}

export function CustomRatesRow({ clientId, rate }: CustomRatesRowProps) {
	const [isEditing, setIsEditing] = useState(false);

	const trpcUtils = trpc.useUtils();

	const { mutateAsync: deleteCustomRate } =
		trpc.supportItem.deleteCustomRate.useMutation();
	const { mutateAsync: updateCustomRate } =
		trpc.supportItem.updateCustomRate.useMutation();

	const [weekdayRate, setWeekdayRate] = useState<string>();
	const [weeknightRate, setWeeknightRate] = useState("");
	const [saturdayRate, setSaturdayRate] = useState("");
	const [sundayRate, setSundayRate] = useState("");

	const isDirty = useMemo(() => {
		return (
			(rate.weekdayRate && weekdayRate !== rate.weekdayRate?.toString()) ||
			(rate.weeknightRate &&
				weeknightRate !== rate.weeknightRate?.toString()) ||
			(rate.saturdayRate && saturdayRate !== rate.saturdayRate?.toString()) ||
			(rate.sundayRate && sundayRate !== rate.sundayRate?.toString()) ||
			(!rate.weekdayRate && weekdayRate) ||
			(!rate.weeknightRate && weeknightRate) ||
			(!rate.saturdayRate && saturdayRate) ||
			(!rate.sundayRate && sundayRate)
		);
	}, [
		weekdayRate,
		weeknightRate,
		saturdayRate,
		sundayRate,
		rate.weekdayRate,
		rate.weeknightRate,
		rate.saturdayRate,
		rate.sundayRate,
	]);

	async function onUpdate() {
		updateCustomRate({
			id: rate.id,
			supportItemRates: {
				weekdayRate: weekdayRate ? Number(weekdayRate) : undefined,
				weeknightRate: weeknightRate ? Number(weeknightRate) : undefined,
				saturdayRate: saturdayRate ? Number(saturdayRate) : undefined,
				sundayRate: sundayRate ? Number(sundayRate) : undefined,
			},
		}).then(() => {
			setIsEditing(false);
			trpcUtils.supportItem.getCustomRatesForClient.invalidate({
				id: clientId,
			});
		});
	}

	function onDelete() {
		deleteCustomRate({ id: rate.id }).then(() =>
			trpcUtils.supportItem.getCustomRatesForClient.invalidate({
				id: clientId,
			})
		);
	}

	useEffect(() => {
		if (isEditing) {
			setWeekdayRate(rate.weekdayRate?.toString() ?? "");
			setWeeknightRate(rate.weeknightRate?.toString() ?? "");
			setSaturdayRate(rate.saturdayRate?.toString() ?? "");
			setSundayRate(rate.sundayRate?.toString() ?? "");
		}
	}, [isEditing, rate]);

	if (isEditing) {
		return (
			<TableRow key={rate.id}>
				<TableCell className="p-2">{rate.supportItem.description}</TableCell>
				<CustomRatesCell value={weekdayRate} setValue={setWeekdayRate} />
				<CustomRatesCell value={weeknightRate} setValue={setWeeknightRate} />
				<CustomRatesCell value={saturdayRate} setValue={setSaturdayRate} />
				<CustomRatesCell value={sundayRate} setValue={setSundayRate} />

				<TableCell className="gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={onUpdate}
						disabled={!isDirty}
					>
						<Check className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsEditing(false)}
					>
						<X className="h-4 w-4" />
					</Button>
				</TableCell>
			</TableRow>
		);
	}

	return (
		<TableRow key={rate.id}>
			<TableCell className="p-2">{rate.supportItem.description}</TableCell>
			<TableCell className="p-2">
				{rate.weekdayRate && decimalToCurrencyString(rate.weekdayRate)}
			</TableCell>
			<TableCell className="p-2">
				{rate.weeknightRate && decimalToCurrencyString(rate.weeknightRate)}
			</TableCell>
			<TableCell className="p-2">
				{rate.saturdayRate && decimalToCurrencyString(rate.saturdayRate)}
			</TableCell>
			<TableCell className="p-2">
				{rate.sundayRate && decimalToCurrencyString(rate.sundayRate)}
			</TableCell>
			<TableCell className="gap-2">
				<Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
					<Pencil className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => onDelete()}
					className="text-red-500"
				>
					<Trash className="h-4 w-4" />
				</Button>
			</TableCell>
		</TableRow>
	);
}
