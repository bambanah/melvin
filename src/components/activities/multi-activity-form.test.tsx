import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutateAsync } = vi.hoisted(() => ({
	mutateAsync: vi.fn()
}));

vi.mock("react-toastify", () => ({
	toast: { error: vi.fn(), success: vi.fn() }
}));

// Replace the client picker with a plain input so the test drives the form's
// validation/field-array wiring rather than the picker's popover internals.
vi.mock("@/components/forms/client-quick-select", () => ({
	ClientQuickSelect: ({
		value,
		onChange
	}: {
		value: string;
		onChange: (id: string) => void;
	}) => (
		<input
			aria-label="client"
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	)
}));

vi.mock("@/lib/trpc", () => ({
	trpc: {
		useUtils: () => ({
			activity: {
				byDateRange: { invalidate: vi.fn() },
				list: { invalidate: vi.fn() },
				pending: { invalidate: vi.fn() }
			}
		}),
		user: {
			fetch: {
				useQuery: () => ({
					data: {
						defaultSupportItemId: "default-item",
						defaultGroupSupportItemId: "group-item"
					}
				})
			}
		},
		activity: {
			bulkAdd: {
				useMutation: () => ({ mutateAsync, isPending: false })
			}
		}
	}
}));

import { MultiActivityForm } from "./multi-activity-form";

async function fillRow(
	user: ReturnType<typeof userEvent.setup>,
	rowIndex: number,
	{ client, range }: { client: string; range: string }
) {
	const clientInputs = screen.getAllByLabelText("client");
	await user.type(clientInputs[rowIndex], client);

	const timeInputs = screen.getAllByTestId("time-range-input");
	await user.type(timeInputs[rowIndex], range);
	await user.tab(); // blur → TimeRangeInput parses and commits the value
}

describe("MultiActivityForm", () => {
	beforeEach(() => {
		mutateAsync.mockReset();
		mutateAsync.mockResolvedValue({ activities: [{}], tripId: null });
	});

	it("blocks submit and shows a row error when a row ends before it starts", async () => {
		const user = userEvent.setup();
		render(
			<MultiActivityForm
				date={new Date("2026-07-20T00:00:00Z")}
				open
				onOpenChange={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: /add activity/i }));

		await fillRow(user, 0, { client: "client-1", range: "09:00-10:00" });
		await fillRow(user, 1, { client: "client-2", range: "13:00-09:00" });

		await user.click(screen.getByRole("button", { name: /save all/i }));

		await waitFor(() =>
			expect(
				screen.getByText(/End time must be after start time/)
			).toBeInTheDocument()
		);
		expect(mutateAsync).not.toHaveBeenCalled();
	});

	it("submits the built payload when every row is valid", async () => {
		const user = userEvent.setup();
		render(
			<MultiActivityForm
				date={new Date("2026-07-20T00:00:00Z")}
				open
				onOpenChange={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: /add activity/i }));

		await fillRow(user, 0, { client: "client-1", range: "09:00-10:00" });
		await fillRow(user, 1, { client: "client-2", range: "10:00-11:00" });

		await user.click(screen.getByRole("button", { name: /save all/i }));

		await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

		const payload = mutateAsync.mock.calls[0][0];
		expect(payload.autoCreateTrip).toBe(true);
		expect(payload.activities).toHaveLength(2);
		expect(payload.activities[0]).toMatchObject({
			clientId: "client-1",
			startTime: "09:00",
			endTime: "10:00",
			supportItemId: "default-item"
		});
		expect(payload.activities[1]).toMatchObject({
			clientId: "client-2",
			startTime: "10:00",
			endTime: "11:00"
		});
	});

	it("pre-fills a new row's start time with the previous row's end time", async () => {
		const user = userEvent.setup();
		render(
			<MultiActivityForm
				date={new Date("2026-07-20T00:00:00Z")}
				open
				onOpenChange={vi.fn()}
			/>
		);

		await fillRow(user, 0, { client: "client-1", range: "09:00-10:30" });
		await user.click(screen.getByRole("button", { name: /add activity/i }));

		const timeInputs = screen.getAllByTestId(
			"time-range-input"
		) as HTMLInputElement[];
		// The second row opens with its start time seeded from row one's end
		expect(timeInputs[1].value).toContain("10:30");
	});

	it("warns instead of submitting when no rows are filled", async () => {
		const { toast } = await import("react-toastify");
		const user = userEvent.setup();
		render(
			<MultiActivityForm
				date={new Date("2026-07-20T00:00:00Z")}
				open
				onOpenChange={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: /save all/i }));

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Add at least one activity")
		);
		expect(mutateAsync).not.toHaveBeenCalled();
	});
});
