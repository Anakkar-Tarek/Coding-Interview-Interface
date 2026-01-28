describe("Session model (unit)", () => {
  test("default session has language and code", () => {
    const session = {
      language: "javascript",
      code: "console.log('test')",
    };

    expect(session.language).toBe("javascript");
    expect(session.code).toContain("console.log");
  });
});
