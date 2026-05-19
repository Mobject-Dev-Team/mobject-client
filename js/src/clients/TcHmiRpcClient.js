const RpcClientBase = require("../core/RpcClientBase");
const TcHmiConnectionStrategy = require("../strategies/TcHmiConnectionStrategy");

class TcHmiRpcClient extends RpcClientBase {
  #strategy;
  #configured = false;
  #configuringPromise = null;

  constructor(symbolName, config = {}) {
    const defaultSymbol = symbolName || "%s%PLC1.MAIN.server.HandleRequest%/s%";
    const serverConnectionStrategy = new TcHmiConnectionStrategy(defaultSymbol);
    super(serverConnectionStrategy, config);
    this.#strategy = serverConnectionStrategy;
  }

  async rpcCall(methodName, params = {}, timeout) {
    await this.#ensureConfigured();
    return super.rpcCall(methodName, params, timeout);
  }

  async #ensureConfigured() {
    if (this.#configured) return;
    if (!this.#configuringPromise) {
      this.#configuringPromise = this.#fetchConfiguration();
    }
    await this.#configuringPromise;
  }

  async #fetchConfiguration() {
    try {
      const payloadSize = await this.#strategy.getConfiguredPayloadSize();
      super.configure(payloadSize);
    } catch {
      // server does not support GetConfiguredPayloadSize, keep default
    }
    this.#configured = true;
  }
}

module.exports = TcHmiRpcClient;
