const RpcClientBase = require("../core/RpcClientBase");
const AdsClientConnectionStrategy = require("../strategies/AdsClientConnectionStrategy");
const { Client } = require("ads-client");

class RpcClient extends RpcClientBase {
  #client;

  constructor(
    amsNetId,
    adsPort,
    symbolName = "MAIN.api",
    methodName = "HandleRequest",
    config = {}
  ) {
    if (!amsNetId || !adsPort) {
      throw new Error("amsNetId and adsPort are required parameters.");
    }

    const client = new Client({
      targetAmsNetId: amsNetId,
      targetAdsPort: adsPort,
    });

    const serverConnectionStrategy = new AdsClientConnectionStrategy(
      client,
      symbolName,
      methodName
    );

    super(serverConnectionStrategy, config);

    this.#client = client;
  }

  async connect() {
    try {
      await this.#client.connect();
    } catch (error) {
      console.error("Failed to connect:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.#client.disconnect();
    } catch (error) {
      console.error("Failed to disconnect:", error);
      throw error;
    }
  }
}

module.exports = RpcClient;
