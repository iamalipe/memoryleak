describe("/app — Notebook editor", () => {
  beforeEach(() => {
    // Clear IndexedDB between tests for isolation
    indexedDB.deleteDatabase("memoryleak-fs");
    cy.visit("/app");
    cy.get("[data-cy=app-page]").should("exist");
  });

  it("loads the app page", () => {
    cy.get("[data-cy=editor-toolbar]").should("exist");
    cy.get("[data-cy=file-tree]").should("exist");
  });

  it("shows empty state in file tree", () => {
    cy.get("[data-cy=file-tree]").contains("No files yet");
  });

  it("creates a new markdown file via toolbar", () => {
    cy.window().then((win) => {
      cy.stub(win, "prompt").returns("intro.md");
    });
    cy.get("[data-cy=new-file-btn]").click();
    cy.get("[data-cy=file-tree-item]").should("contain", "intro.md");
  });

  it("creates a new folder via toolbar", () => {
    cy.window().then((win) => {
      cy.stub(win, "prompt").returns("docs");
    });
    cy.get("[data-cy=new-folder-btn]").click();
    cy.get("[data-cy=file-tree-item]").should("contain", "docs");
  });

  it("clicking a file updates the URL", () => {
    cy.window().then((win) => {
      cy.stub(win, "prompt").returns("readme.md");
    });
    cy.get("[data-cy=new-file-btn]").click();
    cy.get("[data-cy=file-tree-item]").contains("readme.md").click();
    cy.url().should("include", "/app/readme.md");
  });

  it("shows editor and preview after selecting a markdown file", () => {
    cy.window().then((win) => {
      cy.stub(win, "prompt").returns("notes.md");
    });
    cy.get("[data-cy=new-file-btn]").click();
    cy.get("[data-cy=file-tree-item]").contains("notes.md").click();
    cy.get("[data-cy=markdown-editor]").should("exist");
    cy.get("[data-cy=markdown-preview]").should("exist");
  });

  it("typing in editor updates the preview", () => {
    cy.window().then((win) => {
      cy.stub(win, "prompt").returns("test.md");
    });
    cy.get("[data-cy=new-file-btn]").click();
    cy.get("[data-cy=file-tree-item]").contains("test.md").click();
    cy.get("[data-cy=markdown-editor]").type("# Hello World", { delay: 30 });
    cy.get("[data-cy=markdown-preview]").should("contain", "Hello World");
  });

  it("wikilinks appear in preview and navigate on click", () => {
    // Create two files
    cy.window().then((win) => {
      cy.stub(win, "prompt")
        .onFirstCall()
        .returns("page-a.md")
        .onSecondCall()
        .returns("page-b.md");
    });
    cy.get("[data-cy=new-file-btn]").click();
    cy.get("[data-cy=new-file-btn]").click();

    cy.get("[data-cy=file-tree-item]").contains("page-a.md").click();
    cy.get("[data-cy=markdown-editor]").type("[[page-b]]", { delay: 30 });
    cy.get("[data-cy=wikilink]").should("exist").click();
    cy.url().should("include", "page-b.md");
  });

  it("rejects files larger than 100 MB", () => {
    // Create a fake >100MB file
    const largeBlob = new Blob([new ArrayBuffer(101 * 1024 * 1024)], {
      type: "image/png",
    });
    const file = new File([largeBlob], "huge.png", { type: "image/png" });
    cy.get("[data-cy=upload-input]").selectFile(
      { contents: file, fileName: "huge.png" },
      { force: true }
    );
    cy.contains("exceeds 100 MB").should("exist");
  });

  it("shows Connect Google Drive button when not synced", () => {
    cy.get("[data-cy=sync-status]").should("exist");
    cy.get("[data-cy=connect-drive-btn]").should("exist");
  });

  it("deletes a file and removes it from the tree", () => {
    cy.window().then((win) => {
      cy.stub(win, "prompt").returns("todelete.md");
    });
    cy.get("[data-cy=new-file-btn]").click();
    cy.get("[data-cy=file-tree-item]")
      .contains("todelete.md")
      .trigger("mouseover");
    cy.get("[data-cy=file-tree-item-menu]").first().click();
    cy.get("[data-cy=delete-item]").click();
    cy.get("[data-cy=file-tree-item]").should("not.contain", "todelete.md");
  });
});
