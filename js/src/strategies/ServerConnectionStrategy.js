class ServerConnectionStrategy {
  async request(SerializedHeader, SerializedPayload) {
    throw new Error("Not implemented");
  }

  async getConfiguredPayloadSize() {
    throw new Error("Not implemented");
  }
}

module.exports = ServerConnectionStrategy;
