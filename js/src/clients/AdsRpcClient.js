const RpcClientBase = require("../core/RpcClientBase");
const AdsClientConnectionStrategy = require("../strategies/AdsClientConnectionStrategy");
const { Client } = require("ads-client");

class AdsRpcClient extends RpcClientBase {
  #client;
  #strategy;
  isConnected = false;

  constructor(
    amsNetId = "127.0.0.1.1.1",
    adsPort = 851,
    symbolName = "MAIN.server",
    methodName = "HandleRequest",
    config = {}
  ) {
    // clientSettings are passed through to the underlying ads-client Client,
    // e.g. routerAddress/localAmsNetId for router-less (Linux) connections.
    const { clientSettings = {}, ...baseConfig } = config;
    const client = new Client({
      targetAmsNetId: amsNetId,
      targetAdsPort: adsPort,
      autoReconnect: false,
      ...clientSettings,
    });

    client.on("disconnect", () => {
      this.isConnected = false;
    });

    client.on("connect", () => {
      this.isConnected = true;
    });

    const serverConnectionStrategy = new AdsClientConnectionStrategy(
      client,
      symbolName,
      methodName
    );

    super(serverConnectionStrategy, baseConfig);

    this.#client = client;
    this.#strategy = serverConnectionStrategy;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      await this.#client.connect();
    } catch (error) {
      console.error("Failed to connect:", error);
      throw error;
    }

    try {
      const payloadSize = await this.#strategy.getConfiguredPayloadSize();
      super.configure(payloadSize);
    } catch {
      // server does not support GetConfiguredPayloadSize, keep default
    }
  }

  async rpcCall(methodName, params = {}, timeout = 60000) {
    if (!this.isConnected) {
      throw new Error(
        "No active connection. Please connect before calling RPC methods."
      );
    }

    return await super.rpcCall(methodName, params, timeout);
  }

  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.#client.disconnect();
    } catch (error) {
      console.error("Failed to disconnect:", error);
      throw error;
    }
  }
}

module.exports = AdsRpcClient;
