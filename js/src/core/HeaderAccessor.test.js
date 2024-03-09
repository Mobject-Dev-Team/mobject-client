const Header = require("./Header"); // Adjust the path as necessary
const HeaderAccessor = require("./HeaderAccessor"); // Adjust the path as necessary

describe("HeaderAccessor class", () => {
  let header;

  beforeEach(() => {
    header = new Header();
  });

  test("acceptTypeIsJson should return true if Accept header is set to application/json", () => {
    HeaderAccessor.updateAcceptedFormatToJson(header);
    expect(HeaderAccessor.acceptTypeIsJson(header)).toBe(true);
  });

  test("readAcceptType should return the correct Accept header value", () => {
    const expectedFormat = "application/xml";
    HeaderAccessor.updateAcceptedFormat(header, expectedFormat);
    expect(HeaderAccessor.readAcceptType(header)).toBe(expectedFormat);
  });

  test("updateChunkInformation should correctly update chunk-related headers", () => {
    HeaderAccessor.updateChunkInformation(header, 1, 3);
    expect(header.GetField(HeaderAccessor.headerKey_ChunkSequence)).toBe(2);
    expect(header.GetField(HeaderAccessor.headerKey_ChunkTotal)).toBe(3);
    expect(header.GetField(HeaderAccessor.headerKey_HasMoreChunks)).toBe(true);
  });

  test("updateContentTypeToJson should set Content-Type header to application/json", () => {
    HeaderAccessor.updateContentTypeToJson(header);
    expect(header.GetField(HeaderAccessor.headerKey_ContentType)).toBe(
      "application/json"
    );
  });

  test("readMessage should return the correct message from the header", () => {
    const testMessage = "This is a test message";
    header.WriteField(HeaderAccessor.headerKey_Message, testMessage);
    expect(HeaderAccessor.readMessage(header)).toBe(testMessage);
  });

  test("readResponseId should return the correct response ID from the header", () => {
    const responseId = "12345";
    header.WriteField(HeaderAccessor.headerKey_ResponseId, responseId);
    expect(HeaderAccessor.readResponseId(header)).toBe(responseId);
  });

  test("readRetryDelay should return the correct retry delay from the header", () => {
    const retryDelay = "3000";
    header.WriteField(HeaderAccessor.headerKey_RetryDelay, retryDelay);
    expect(HeaderAccessor.readRetryDelay(header)).toBe(retryDelay);
  });

  test("readSessionId should return the correct session ID from the header", () => {
    const sessionId = "abcde-12345";
    header.WriteField(HeaderAccessor.headerKey_SessionId, sessionId);
    expect(HeaderAccessor.readSessionId(header)).toBe(sessionId);
  });

  test("readStatus should return the correct status from the header", () => {
    const status = "success";
    header.WriteField(HeaderAccessor.headerKey_Status, status);
    expect(HeaderAccessor.readStatus(header)).toBe(status);
  });

  test("updateMethodName should correctly update method name in the header", () => {
    const methodName = "TestMethod";
    HeaderAccessor.updateMethodName(header, methodName);
    expect(header.GetField(HeaderAccessor.headerKey_MethodName)).toBe(
      methodName
    );
  });

  test("updateRequestId should correctly update request ID in the header", () => {
    const requestId = "req-123";
    HeaderAccessor.updateRequestId(header, requestId);
    expect(header.GetField(HeaderAccessor.headerKey_RequestId)).toBe(requestId);
  });

  test("updateResponseId should correctly update response ID in the header", () => {
    const responseId = "resp-456";
    HeaderAccessor.updateResponseId(header, responseId);
    expect(header.GetField(HeaderAccessor.headerKey_ResponseId)).toBe(
      responseId
    );
  });

  test("updateSessionId should correctly update session ID in the header", () => {
    const sessionId = "sess-789";
    HeaderAccessor.updateSessionId(header, sessionId);
    expect(header.GetField(HeaderAccessor.headerKey_SessionId)).toBe(sessionId);
  });

  test("updateType should correctly update type in the header", () => {
    const type = "TypeTest";
    HeaderAccessor.updateType(header, type);
    expect(header.GetField(HeaderAccessor.headerKey_Type)).toBe(type);
  });

  test("updateChunkInformation should not update for total chunks <= 1", () => {
    HeaderAccessor.updateChunkInformation(header, 0, 1); // should not update
    expect(header.GetField(HeaderAccessor.headerKey_ChunkSequence)).toBe(
      undefined
    );
    expect(header.GetField(HeaderAccessor.headerKey_ChunkTotal)).toBe(
      undefined
    );
    expect(header.GetField(HeaderAccessor.headerKey_HasMoreChunks)).toBe(
      undefined
    );
  });

  test("updateChunkInformation should correctly handle last chunk", () => {
    HeaderAccessor.updateChunkInformation(header, 2, 3); // Last chunk
    expect(header.GetField(HeaderAccessor.headerKey_HasMoreChunks)).toBe(false);
  });
});
