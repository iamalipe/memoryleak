describe("AI SVG Logo Maker Page", () => {
  beforeEach(() => {
    // Clear localStorage to ensure clean tests
    cy.clearLocalStorage();
    cy.visit("/svg");
  });

  it("loads the page and renders all essential components", () => {
    cy.get("[data-cy=svg-maker-page]").should("exist");
    cy.get("[data-cy=api-key-card]").should("exist");
    cy.get("[data-cy=api-key-status-missing]").should("exist");
    cy.get("[data-cy=size-selector-section]").should("exist");
    cy.get("[data-cy=style-selector-section]").should("exist");
    cy.get("[data-cy=prompt-textarea]").should("exist");
    cy.get("[data-cy=generate-btn]").should("be.disabled");
    cy.get("[data-cy=empty-preview-state]").should("exist");
  });

  it("allows entering, saving, and clearing a Gemini API key", () => {
    const mockApiKey = "AIzaSyTestApiKey123456";

    // Enter and save API Key
    cy.get("[data-cy=api-key-input]").type(mockApiKey);
    cy.get("[data-cy=save-api-key-btn]").click();

    // Assert configuration state updates
    cy.get("[data-cy=api-key-status-configured]").should("exist");
    cy.get("[data-cy=api-key-status-missing]").should("not.exist");
    
    // Verify it is saved in localStorage
    cy.getAllLocalStorage().then((storage) => {
      const origin = Object.keys(storage)[0];
      const savedKey = storage[origin]["self-notebook-gemini-api-key"];
      expect(savedKey).to.equal(mockApiKey);
    });

    // Clear API Key
    cy.get("[data-cy=clear-api-key-btn]").click();
    cy.get("[data-cy=api-key-status-missing]").should("exist");
    cy.get("[data-cy=api-key-status-configured]").should("not.exist");

    // Verify it is removed from localStorage
    cy.getAllLocalStorage().then((storage) => {
      const origin = Object.keys(storage)[0];
      expect(storage[origin]).to.not.have.property("self-notebook-gemini-api-key");
    });
  });

  it("allows modifying custom dimensions and presets", () => {
    // Enter custom width and height
    cy.get("[data-cy=width-input]").clear().type("320").blur();
    cy.get("[data-cy=height-input]").clear().type("240").blur();

    cy.get("[data-cy=width-input]").should("have.value", "320");
    cy.get("[data-cy=height-input]").should("have.value", "240");

    // Click a preset and check it overrides values
    cy.get("[data-cy=size-preset-256x256]").click();
    cy.get("[data-cy=width-input]").should("have.value", "256");
    cy.get("[data-cy=height-input]").should("have.value", "256");
  });

  it("enables the generate button only when prompt is filled and API key is saved", () => {
    const mockApiKey = "AIzaSyTestApiKey123456";

    // Fill prompt first (should remain disabled because key is missing)
    cy.get("[data-cy=prompt-textarea]").type("A cyber owl logo");
    cy.get("[data-cy=generate-btn]").should("be.disabled");

    // Fill key next
    cy.get("[data-cy=api-key-input]").type(mockApiKey);
    cy.get("[data-cy=save-api-key-btn]").click();

    // Verify generate button is enabled
    cy.get("[data-cy=generate-btn]").should("not.be.disabled");

    // Clear prompt (should disable again)
    cy.get("[data-cy=prompt-textarea]").clear();
    cy.get("[data-cy=generate-btn]").should("be.disabled");
  });
});
