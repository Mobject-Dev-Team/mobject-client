describe("JsonPayloadMarshaller", () => {
  const Header = require("./Header");
  const HeaderAccessor = require("./HeaderAccessor");
  const JsonPayloadMarshaller = require("./JsonPayloadMarshaller");
  const marshaller = new JsonPayloadMarshaller();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("marshall", () => {
    it("should update content type to JSON and return stringified payload", () => {
      const header = new Header();
      const payload = { key: "value" };
      jest.spyOn(HeaderAccessor, "updateContentTypeToJson");

      const result = marshaller.marshall(header, payload);

      expect(HeaderAccessor.updateContentTypeToJson).toHaveBeenCalledWith(
        header
      );
      expect(result).toEqual(JSON.stringify(payload));
    });

    it("should return undefined for non-object payloads", () => {
      const header = new Header();
      const payload = "Not an object";

      const result = marshaller.marshall(header, payload);

      expect(result).toBeUndefined();
    });

    it("should return undefined for null payloads", () => {
      const header = new Header();
      const payload = null;

      const result = marshaller.marshall(header, payload);

      expect(result).toBeUndefined();
    });

    it("should return undefined for File instance payloads", () => {
      const header = new Header();
      const payload = new File([""], "filename");

      const result = marshaller.marshall(header, payload);

      expect(result).toBeUndefined();
    });
  });

  describe("unmarshall", () => {
    it("should parse serialized JSON payload", () => {
      const serializedPayload = JSON.stringify({ key: "value" });

      const result = marshaller.unmarshall(serializedPayload);

      expect(result).toEqual({ key: "value" });
    });
  });
});
