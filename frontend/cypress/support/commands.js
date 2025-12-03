/// <reference types="cypress" />

const STORAGE_KEY = "stellar_auth_v1";

Cypress.Commands.add("loginViaApi", (utorid, password) => {
    const apiUrl = Cypress.env("apiUrl");
    cy.session([utorid], () => {
        cy.request("POST", `${apiUrl}/auth/tokens`, {
            utorid,
            password,
        }).then(({ body }) => {
            const token = body.token;
            expect(token, "JWT from /auth/tokens").to.be.a("string");
            cy.request({
                method: "GET",
                url: `${apiUrl}/users/me`,
                headers: { Authorization: `Bearer ${token}` },
            }).then(({ body: profile }) => {
                cy.window().then((win) => {
                    win.localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify({ token, user: profile }),
                    );
                });
            });
        });
    });
});

Cypress.Commands.add("loginAsOrganizer", () => {
    cy.loginViaApi(Cypress.env("organizerUtorid"), Cypress.env("demoPassword"));
});

Cypress.Commands.add("loginAsManager", () => {
    cy.loginViaApi(Cypress.env("managerUtorid"), Cypress.env("demoPassword"));
});
