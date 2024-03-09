const SequentialRequestIdGenerator = require("./SequentialRequestIdGenerator"); // Adjust the path as necessary

describe("SequentialRequestIdGenerator class", () => {
  test("should initialize with a default seed of 0", () => {
    const generator = new SequentialRequestIdGenerator();
    expect(generator.generate()).toBe("1"); // First ID after initialization
  });

  test("should initialize with a provided seed value", () => {
    const seed = 100;
    const generator = new SequentialRequestIdGenerator(seed);
    expect(generator.generate()).toBe("101"); // First ID after initialization with seed
  });

  test("generate should correctly increment the ID", () => {
    const generator = new SequentialRequestIdGenerator();
    const firstId = generator.generate(); // Should be '1'
    const secondId = generator.generate(); // Should be '2'
    expect(firstId).toBe("1");
    expect(secondId).toBe("2");
  });

  test("generate maintains correct sequence over multiple invocations", () => {
    const seed = 5;
    const generator = new SequentialRequestIdGenerator(seed);
    expect(generator.generate()).toBe("6"); // First invocation
    expect(generator.generate()).toBe("7"); // Second invocation
    expect(generator.generate()).toBe("8"); // Third invocation
    // This confirms the sequence is maintained correctly
  });
});
