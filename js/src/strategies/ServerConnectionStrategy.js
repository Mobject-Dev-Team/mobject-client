class ServerConnectionStrategy {
  async request(SerializedHeader, SerializedPayload) {
    throw new Error("Not implemented");
  }
}

module.exports = ServerConnectionStrategy;
