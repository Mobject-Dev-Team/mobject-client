const AsyncClient = require("./AsyncClient");
const Header = require("./Header");
const HeaderAccessor = require("./HeaderAccessor");
const JsonPayloadMarshaller = require("./JsonPayloadMarshaller");

class RpcClientBase {
  #client = null;
  #marshaller = new JsonPayloadMarshaller();

  constructor(serverConnectionStrategy, config = {}) {
    this.#client = new AsyncClient(serverConnectionStrategy, config);
  }

  configure(chunkSize) {
    this.#client.configure(chunkSize);
  }

  async rpcCall(methodName, params = "", timeout, options) {
    const header = new Header();

    HeaderAccessor.updateType(header, "RPC 1.0");
    HeaderAccessor.updateMethodName(header, methodName);

    return this.#client.request(
      header,
      params,
      this.#marshaller,
      timeout,
      options
    );
  }

  // Abandon every request still in flight, rejecting each with an ABORTED
  // error. Intended for tearing a client down, or for making it safe to reuse
  // after a caller has stopped waiting on something.
  abortAll(reason) {
    return this.#client.abortAll(reason);
  }

  abort(requestId, reason) {
    return this.#client.abort(requestId, reason);
  }

  get activeRequestCount() {
    return this.#client.activeRequestCount;
  }
}

module.exports = RpcClientBase;
