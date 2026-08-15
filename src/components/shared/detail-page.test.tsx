import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailHeader } from "./detail-page";

describe("DetailHeader", () => {
	it("Should render the title as the page's h1", () => {
		render(<DetailHeader title="Invoice 12" />);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Invoice 12"
		);
	});

	it("Should render the eyebrow, subline, badge and actions around it", () => {
		render(
			<DetailHeader
				eyebrow="Monday, 3 March 2025"
				title="Invoice 12"
				badge={<span>Draft</span>}
				subline="Bill to Ada Lovelace"
				actions={<button type="button">Mark as Sent</button>}
			/>
		);

		expect(screen.getByText("Monday, 3 March 2025")).toBeInTheDocument();
		expect(screen.getByText("Draft")).toBeInTheDocument();
		expect(screen.getByText("Bill to Ada Lovelace")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Mark as Sent" })
		).toBeInTheDocument();
	});

	it("Should omit the eyebrow and subline lines when the entity has neither", () => {
		const { rerender } = render(
			<DetailHeader eyebrow="Client" title="Ada Lovelace" subline="430000001" />
		);

		expect(screen.getByText("Client")).toBeInTheDocument();

		rerender(<DetailHeader title="Ada Lovelace" />);

		expect(screen.queryByText("Client")).not.toBeInTheDocument();
		expect(screen.queryByText("430000001")).not.toBeInTheDocument();
	});

	it("Should render facts below the title row", () => {
		render(
			<DetailHeader title="Ada Lovelace">
				<dl>
					<dt>Participant number</dt>
					<dd>430000001</dd>
				</dl>
			</DetailHeader>
		);

		expect(screen.getByText("430000001")).toBeInTheDocument();
	});
});
