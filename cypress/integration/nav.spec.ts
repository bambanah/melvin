describe("Authentication", () => {
	it("should navigate to the login page when unauthenticated", () => {
		// Start from the index page
		cy.visit("/");

		cy.get("[data-cy=nav-item]").contains("Invoices").click();

		// The new url should include "/about"
		cy.url().should("include", "/login");

		// The new page should contain an h1 with "About page"
		cy.get("h1").contains("Login");
	});
});
