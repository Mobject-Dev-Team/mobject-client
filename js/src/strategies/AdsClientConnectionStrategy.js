const ServerConnectionStrategy = require("./ServerConnectionStrategy");

class AdsClientConnectionStrategy extends ServerConnectionStrategy {
  #client;
  #symbolName;
  #methodName;

  constructor(client, symbolName, methodName) {
    super();
    this.#client = client;
    this.#symbolName = symbolName;
    this.#methodName = methodName;
  }

  async request(SerializedHeader, SerializedPayload) {
    const result = await this.#client.invokeRpcMethod(
      this.#symbolName,
      this.#methodName,
      { SerializedHeader, SerializedPayload }
    );
    return result.returnValue;
  }
}

module.exports = AdsClientConnectionStrategy;
