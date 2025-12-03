describe("Authentication gate", () => {
    it("redirects unauthenticated visitors to login", () => {
        cy.clearLocalStorage();
        cy.visit("/organizer/events");
        cy.url().should("include", "/login");
        cy.get("[data-cy='login-utorid']").should("be.visible");
    });

    it("allows managers to open the user administration page", () => {
        cy.loginAsManager();
        cy.visit("/manager/users");
        cy.contains("User administration").should("be.visible");
        cy.get("table").within(() => {
            cy.contains("User");
            cy.contains("Role");
        });
    });
});
