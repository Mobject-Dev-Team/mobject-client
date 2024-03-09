const Header = require("./Header"); // Adjust the path as necessary

describe("Header class", () => {
  test("should initialize with empty object if no initial value is provided", () => {
    const header = new Header();
    expect(header.toString()).toBe("{}");
  });

  test("should initialize with provided JSON string", () => {
    const initial = '{"key": "value"}';
    const header = new Header(initial);
    expect(header.GetField("key")).toBe("value");
  });

  test("should ignore invalid JSON and initialize with empty object", () => {
    const initial = "invalid JSON";
    const header = new Header(initial);
    expect(header.toString()).toBe("{}");
  });

  test("WriteField should add or update a header field", () => {
    const header = new Header();
    header.WriteField("newKey", "newValue");
    expect(header.GetField("newKey")).toBe("newValue");
  });

  test("toString should return a JSON string representation of the header", () => {
    const header = new Header('{"testKey": "testValue"}');
    expect(header.toString()).toBe('{"testKey":"testValue"}');
  });

  test("toJSON should return a JSON string representation of the header", () => {
    const header = new Header('{"jsonKey": "jsonValue"}');
    expect(header.toJSON()).toBe('{"jsonKey":"jsonValue"}');
  });
});
