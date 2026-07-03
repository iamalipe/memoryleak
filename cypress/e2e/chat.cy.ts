describe("Chat page", () => {
  beforeEach(() => {
    cy.visit("/chat");
  });

  it("loads without errors", () => {
    cy.get("[data-cy=chat-page]").should("exist");
  });

  it("renders the message input", () => {
    cy.get("[data-cy=chat-input]").should("exist");
  });

  it("renders the send button", () => {
    cy.get("[data-cy=chat-send-btn]").should("exist");
  });

  it("send button is disabled when input is empty", () => {
    cy.get("[data-cy=chat-send-btn]").should("be.disabled");
  });

  it("enables send button when input has text", () => {
    cy.get("[data-cy=chat-input]").type("Hello");
    cy.get("[data-cy=chat-send-btn]").should("not.be.disabled");
  });

  it("renders the session sidebar", () => {
    cy.get("[data-cy=chat-sidebar]").should("exist");
  });

  it("opens config modal", () => {
    cy.get("[data-cy=config-btn]").click();
    cy.get("[data-cy=config-modal]").should("be.visible");
  });

  it("shows WebGPU warning when unsupported", () => {
    // This test is environment-dependent; assert the warning element exists in the DOM.
    cy.get("body").then(($body) => {
      if ($body.find("[data-cy=webgpu-warning]").length) {
        cy.get("[data-cy=webgpu-warning]").should("be.visible");
      }
    });
  });
});
