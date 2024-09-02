const HeaderAccessor = require("./HeaderAccessor");

class JsonPayloadMarshaller {
  marshall(header, payload) {
    HeaderAccessor.updateContentTypeToJson(header);

    if (payload instanceof File) {
      const fileDetails = {
        name: payload.name,
        size: payload.size,
        type: payload.type,
        lastModified: payload.lastModified,
      };
      return JSON.stringify({ file: fileDetails });
    }

    try {
      return JSON.stringify(payload);
    } catch (error) {
      console.log("Failed to stringify the payload:");
      return "";
    }
  }

  unmarshall(seralizedPayload) {
    return JSON.parse(seralizedPayload);
  }
}

module.exports = JsonPayloadMarshaller;
