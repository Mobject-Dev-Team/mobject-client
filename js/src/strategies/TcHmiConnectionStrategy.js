const ServerConnectionStrategy = require("./ServerConnectionStrategy");

class TcHmiConnectionStrategy extends ServerConnectionStrategy {
  #apiHandleClientRequestSymbol;
  #debug = false;

  constructor(handleClientRequestSymbolName) {
    super();
    this.#apiHandleClientRequestSymbol = new TcHmi.Symbol(
      handleClientRequestSymbolName
    );
  }

  #log(...args) {
    if (!this.#debug) return;
    console.log(...args);
  }

  async request(SerializedHeader, SerializedPayload) {
    const requestPayload = {
      SerializedHeader,
      SerializedPayload,
    };
    const serverResponse = await this.#sendRequest(requestPayload);
    return serverResponse;
  }

  async #sendRequest(requestPayload) {
    try {
      return await this.#writeToSymbol(
        this.#apiHandleClientRequestSymbol,
        requestPayload
      );
    } catch (error) {
      throw new Error(`Error in sending request: ${error.message}`);
    }
  }

  async #writeToSymbol(symbol, args) {
    return new Promise((resolve, reject) => {
      this.#log(symbol, args);
      symbol.write(args, (data) => {
        try {
          this.#validateData(data, reject);
          const readValue = this.#getReadValueFromCommand(
            data.response.commands
          );
          resolve(readValue);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  #validateData(data, reject) {
    const { error, response } = data;
    if (error !== TcHmi.Errors.NONE) {
      return reject(new Error(data.details.errors[0].message));
    }
    if (!response || response.error !== undefined) {
      return reject(
        new Error(response ? response.error.message : "Response is undefined")
      );
    }
    if (!response.commands || !response.commands.length) {
      return reject(
        new Error(
          response.commands ? "Command is undefined" : "Commands are undefined"
        )
      );
    }
  }

  #getReadValueFromCommand(commands) {
    const [command] = commands;
    if (command.error !== undefined) {
      throw new Error(command.error.message);
    }
    if (!command.readValue) {
      throw new Error("Failed to read command value");
    }
    return command.readValue;
  }
}

module.exports = TcHmiConnectionStrategy;
