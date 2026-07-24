import { MAX_ADDITIONAL_GROUP_PARTICIPANTS } from "@/schema/invoice-schema";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { GroupParticipantsEditor } from "./group-participants-editor";

/**
 * A trivial client picker: an input per slot, so the tests exercise the
 * editor's list/cap/exclusion wiring rather than any concrete select widget.
 */
function Harness({
	initial = [],
	error
}: {
	initial?: string[];
	error?: string;
}) {
	const [value, setValue] = useState(initial);
	return (
		<GroupParticipantsEditor
			value={value}
			onChange={setValue}
			excludeClientId="primary"
			error={error}
			renderClientSelect={({ value, onChange, excludeClientIds }) => (
				<input
					aria-label="participant"
					data-exclude={excludeClientIds.join(",")}
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			)}
		/>
	);
}

describe("GroupParticipantsEditor", () => {
	it("renders one client select per participant", () => {
		render(<Harness initial={["a", "b"]} />);
		expect(screen.getAllByLabelText("participant")).toHaveLength(2);
	});

	it("appends an empty slot when 'add participant' is clicked", async () => {
		const user = userEvent.setup();
		render(<Harness initial={["a"]} />);

		await user.click(screen.getByText("+ add participant"));

		expect(screen.getAllByLabelText("participant")).toHaveLength(2);
	});

	it("hides the add affordance once the participant cap is reached", () => {
		const full = Array.from({ length: MAX_ADDITIONAL_GROUP_PARTICIPANTS }).map(
			(_, i) => `c${i}`
		);
		render(<Harness initial={full} />);

		expect(screen.getAllByLabelText("participant")).toHaveLength(
			MAX_ADDITIONAL_GROUP_PARTICIPANTS
		);
		expect(screen.queryByText("+ add participant")).not.toBeInTheDocument();
	});

	it("removes the targeted participant", async () => {
		const user = userEvent.setup();
		render(<Harness initial={["a", "b"]} />);

		// Remove buttons are the icon-only buttons (not the add link)
		const removeButtons = screen
			.getAllByRole("button")
			.filter((b) => b.textContent !== "+ add participant");
		await user.click(removeButtons[0]);

		const inputs = screen.getAllByLabelText(
			"participant"
		) as HTMLInputElement[];
		expect(inputs).toHaveLength(1);
		expect(inputs[0].value).toBe("b");
	});

	it("excludes the other selected participants from each slot", () => {
		render(<Harness initial={["a", "b"]} />);
		const inputs = screen.getAllByLabelText("participant");
		// First slot excludes the second participant, and vice versa
		expect(inputs[0].getAttribute("data-exclude")).toBe("b");
		expect(inputs[1].getAttribute("data-exclude")).toBe("a");
	});

	it("shows an error message when provided", () => {
		render(<Harness error="At least one other participant is required" />);
		expect(
			screen.getByText("At least one other participant is required")
		).toBeInTheDocument();
	});
});
