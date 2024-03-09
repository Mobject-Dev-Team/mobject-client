const RpcClientBase = require("./RpcClientBase");
jest.mock("./AsyncClient");
jest.mock("./Header");
jest.mock("./HeaderAccessor");
jest.mock("./JsonPayloadMarshaller");

describe("RpcClientBase", () => {
  let rpcClientBase;
  let asyncClientMock;
  let headerMock;
  let headerAccessorMock;
  let jsonPayloadMarshallerMock;

  beforeEach(() => {
    asyncClientMock = require("./AsyncClient");
    headerMock = require("./Header");
    headerAccessorMock = require("./HeaderAccessor");
    jsonPayloadMarshallerMock = require("./JsonPayloadMarshaller");
    rpcClientBase = new RpcClientBase();
  });

  test("should update header with correct type and method name on rpcCall", async () => {
    const methodName = "testMethod";
    const params = "testParams";
    const timeout = 1000;

    await rpcClientBase.rpcCall(methodName, params, timeout);

    expect(headerAccessorMock.updateType).toHaveBeenCalledWith(
      expect.any(Object),
      "RPC 1.0"
    );
    expect(headerAccessorMock.updateMethodName).toHaveBeenCalledWith(
      expect.any(Object),
      methodName
    );
  });

  test("should call AsyncClient request with correct arguments on rpcCall", async () => {
    const methodName = "testMethod";
    const params = "testParams";
    const timeout = 1000;

    await rpcClientBase.rpcCall(methodName, params, timeout);

    expect(asyncClientMock.prototype.request).toHaveBeenCalledWith(
      expect.any(Object),
      params,
      expect.any(Object),
      timeout
    );
  });
});
