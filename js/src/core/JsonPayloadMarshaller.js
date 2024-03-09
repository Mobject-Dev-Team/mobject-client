const HeaderAccessor = require("./HeaderAccessor");

class JsonPayloadMarshaller {
  marshall(header, payload) {
    if (
      typeof payload !== "object" ||
      payload === null ||
      payload instanceof File
    ) {
      return;
    }

    HeaderAccessor.updateContentTypeToJson(header);
    return JSON.stringify(payload);
  }

  unmarshall(seralizedPayload) {
    return JSON.parse(seralizedPayload);
  }
}

module.exports = JsonPayloadMarshaller;
