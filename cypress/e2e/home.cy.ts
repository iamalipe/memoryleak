describe("Home page", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("loads without errors", () => {
    cy.get("[data-cy=home-page]").should("exist");
  });

  it("renders model selection", () => {
    cy.get("[data-cy=model-select]").should("exist");
  });

  it("navigates to chat on model selection confirmed", () => {
    cy.get("[data-cy=start-chat-btn]").click();
    cy.url().should("include", "/chat");
  });
});
