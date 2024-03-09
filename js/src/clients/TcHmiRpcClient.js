const RpcClientBase = require("../core/RpcClientBase");
const TcHmiConnectionStrategy = require("../strategies/TcHmiConnectionStrategy");

class RpcClient extends RpcClientBase {
  constructor(symbolName, config = {}) {
    const defaultSymbol = symbolName || "%s%PLC1.MAIN.api.HandleRequest%/s%";
    const serverConnectionStrategy = new TcHmiConnectionStrategy(defaultSymbol);
    super(serverConnectionStrategy, config);
  }
}

module.exports = RpcClient;
