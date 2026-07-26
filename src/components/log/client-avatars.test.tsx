import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientAvatars, clientInitials } from "./client-avatars";

describe("clientInitials", () => {
	it("Should take the first and last name parts", () => {
		expect(clientInitials("Ada Lovelace")).toBe("AL");
		expect(clientInitials("Cali Ann Ullrich")).toBe("CU");
	});

	it("Should ignore honorifics and post-nominals", () => {
		expect(clientInitials("Mr. Cali Ullrich")).toBe("CU");
		expect(clientInitials("Mrs. Marquise McKenzie-Casper MD")).toBe("MM");
		expect(clientInitials("Dr Ada Lovelace PhD")).toBe("AL");
	});

	it("Should handle single-word and title-only names", () => {
		expect(clientInitials("Prince")).toBe("P");
		expect(clientInitials("Dr.")).toBe("D");
		expect(clientInitials("   ")).toBe("?");
	});
});

describe("ClientAvatars", () => {
	it("Should render one circle per Client, not one for the group", () => {
		render(<ClientAvatars names={["Mr. Cali Ullrich", "Ada Lovelace"]} />);

		expect(screen.getByText("CU")).toBeInTheDocument();
		expect(screen.getByText("AL")).toBeInTheDocument();
	});

	it("Should collapse the tail of a large group", () => {
		render(
			<ClientAvatars
				names={["Ada Lovelace", "Bo Peep", "Cy Young", "Dee Dee"]}
			/>
		);

		expect(screen.getByText("AL")).toBeInTheDocument();
		expect(screen.getByText("BP")).toBeInTheDocument();
		expect(screen.getByText("+2")).toBeInTheDocument();
		expect(screen.queryByText("CY")).not.toBeInTheDocument();
	});
});
