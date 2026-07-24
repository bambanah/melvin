import type { ActivityTransportItemSchema } from "@/schema/activity-schema";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { TransportItemsEditor } from "./transport-items-editor";

/** Stateful host so interactions flow back through the controlled contract. */
function Harness({
	initial = []
}: {
	initial?: ActivityTransportItemSchema[];
}) {
	const [value, setValue] = useState(initial);
	return <TransportItemsEditor value={value} onChange={setValue} />;
}

const removeButtons = () =>
	screen
		.getAllByRole("button")
		.filter((b) => b.textContent !== "+ parking / tolls");

describe("TransportItemsEditor", () => {
	it("adds a PARKING row when the add affordance is clicked", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

		await user.click(screen.getByText("+ parking / tolls"));

		const select = screen.getByRole("combobox") as HTMLSelectElement;
		expect(select.value).toBe("PARKING");
	});

	it("updates a row's type and amount", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[{ type: "PARKING", amount: 0, note: "" }]} />);

		await user.selectOptions(screen.getByRole("combobox"), "TOLL");
		expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
			"TOLL"
		);

		const amount = screen.getByPlaceholderText("0.00");
		await user.type(amount, "12.5");
		expect(amount).toHaveValue(12.5);
	});

	it("removes the targeted row", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				initial={[
					{ type: "PARKING", amount: 3, note: "" },
					{ type: "TOLL", amount: 7, note: "" }
				]}
			/>
		);

		expect(screen.getAllByRole("combobox")).toHaveLength(2);

		await user.click(removeButtons()[0]);

		expect(screen.getAllByRole("combobox")).toHaveLength(1);
		// The surviving row is the toll
		expect(
			within(screen.getByRole("combobox").closest("div")!).getByRole("combobox")
		).toHaveValue("TOLL");
	});
});
