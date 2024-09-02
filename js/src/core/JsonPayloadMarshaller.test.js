const JsonPayloadMarshaller = require("./JsonPayloadMarshaller");
const HeaderAccessor = require("./HeaderAccessor");

// Mock the HeaderAccessor dependency
jest.mock("./HeaderAccessor", () => ({
  updateContentTypeToJson: jest.fn(),
}));

describe("JsonPayloadMarshaller", () => {
  let marshaller;
  beforeEach(() => {
    marshaller = new JsonPayloadMarshaller();
    HeaderAccessor.updateContentTypeToJson.mockClear();
  });

  describe("marshall", () => {
    it("should update content type to JSON", () => {
      marshaller.marshall({}, {});
      expect(HeaderAccessor.updateContentTypeToJson).toHaveBeenCalled();
    });

    it("handles a File instance correctly", () => {
      const file = new File(["content"], "test.txt", {
        type: "text/plain",
        lastModified: new Date(),
      });
      const result = marshaller.marshall({}, file);
      const expected = JSON.stringify({
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        },
      });
      expect(result).toEqual(expected);
    });

    it("converts a regular object payload to JSON", () => {
      const payload = { key: "value" };
      const result = marshaller.marshall({}, payload);
      expect(result).toEqual(JSON.stringify(payload));
    });

    it("returns an empty string when payload cannot be stringified", () => {
      const cyclicObject = {};
      cyclicObject.self = cyclicObject; // Creating a circular reference
      const result = marshaller.marshall({}, cyclicObject);
      expect(result).toBe("");
    });
  });

  describe("unmarshall", () => {
    it("converts JSON string back to object", () => {
      const serializedPayload = JSON.stringify({ key: "value" });
      const result = marshaller.unmarshall(serializedPayload);
      expect(result).toEqual({ key: "value" });
    });

    it("throws error on invalid JSON string", () => {
      const badJson = "this is not JSON";
      expect(() => {
        marshaller.unmarshall(badJson);
      }).toThrow(SyntaxError);
    });
  });
});
