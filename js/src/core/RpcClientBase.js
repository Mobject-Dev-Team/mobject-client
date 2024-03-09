const AsyncClient = require("./AsyncClient");
const Header = require("./Header");
const HeaderAccessor = require("./HeaderAccessor");
const JsonPayloadMarshaller = require("./JsonPayloadMarshaller");

class RpcClientBase {
  #client = null;

  constructor(serverConnectionStrategy, config = {}) {
    this.#client = new AsyncClient(serverConnectionStrategy, config);
  }

  async rpcCall(methodName, params = "", timeout) {
    const header = new Header();
    const payload = params;
    const marshaller = new JsonPayloadMarshaller();

    HeaderAccessor.updateType(header, "RPC 1.0");
    HeaderAccessor.updateMethodName(header, methodName);

    return this.#client.request(header, payload, marshaller, timeout);
  }
}

module.exports = RpcClientBase;
