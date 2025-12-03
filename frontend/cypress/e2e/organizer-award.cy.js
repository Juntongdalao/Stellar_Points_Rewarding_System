describe("Organizer award workflow", () => {
    beforeEach(() => {
        cy.loginAsOrganizer();
    });

    it("awards all guests from the organizer portal", () => {
        cy.visit("/organizer/events");
        cy.get("[data-cy='organizer-event-card']").should("have.length.at.least", 1);
        cy.get("[data-cy='organizer-manage-event']").first().click();
        cy.url().should("match", /organizer\/events\/\d+$/);
        cy.contains("Guest list").should("be.visible");

        cy.get("[data-cy='award-mode-all']").click();
        cy.get("[data-cy='award-points-input']").clear().type("1");

        cy.intercept("POST", `${Cypress.env("apiUrl")}/events/*/transactions`).as(
            "award",
        );
        cy.get("[data-cy='award-submit']").click();
        cy.wait("@award").its("response.statusCode").should("eq", 201);
    });
});
