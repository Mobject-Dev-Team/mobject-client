class HeaderAccessor {
  static contentType_Json = "application/json";
  static headerKey_Accept = "Accept";
  static headerKey_ChunkSequence = "Chunk-Sequence";
  static headerKey_ChunkTotal = "Chunk-Total";
  static headerKey_ContentType = "Content-Type";
  static headerKey_HasMoreChunks = "Has-More-Chunks";
  static headerKey_ErrorMessage = "Error-Message";
  static headerKey_MethodName = "Method-Name";
  static headerKey_RequestId = "Request-Id";
  static headerKey_ResponseId = "Response-Id";
  static headerKey_RetryDelay = "Retry-Delay";
  static headerKey_SessionId = "Session-Id";
  static headerKey_Status = "Status";
  static headerKey_Type = "Type";
  static headerKey_ErrorCode = "Error-Code";

  static acceptTypeIsJson(header) {
    if (
      header.GetField(HeaderAccessor.headerKey_Accept) ==
      HeaderAccessor.contentType_Json
    ) {
      return true;
    }
  }

  static readAcceptType(header) {
    return header.GetField(HeaderAccessor.headerKey_Accept);
  }

  static readHasMoreChunks(header) {
    return header.GetField(HeaderAccessor.headerKey_HasMoreChunks);
  }

  static readErrorMessage(header) {
    return header.GetField(HeaderAccessor.headerKey_ErrorMessage);
  }

  static readResponseId(header) {
    return header.GetField(HeaderAccessor.headerKey_ResponseId);
  }

  static readRetryDelay(header) {
    return header.GetField(HeaderAccessor.headerKey_RetryDelay);
  }

  static readSessionId(header) {
    return header.GetField(HeaderAccessor.headerKey_SessionId);
  }

  static readStatus(header) {
    return header.GetField(HeaderAccessor.headerKey_Status);
  }

  static readErrorCode(header) {
    return header.GetField(HeaderAccessor.headerKey_ErrorCode);
  }

  static updateAcceptedFormat(header, format) {
    header.WriteField(HeaderAccessor.headerKey_Accept, format);
  }

  static updateAcceptedFormatToJson(header) {
    header.WriteField(
      HeaderAccessor.headerKey_Accept,
      HeaderAccessor.contentType_Json
    );
  }

  static updateChunkInformation(header, currentChunkIndex, totalChunks) {
    if (totalChunks <= 1) {
      return;
    }

    const isLastChunk = currentChunkIndex === totalChunks - 1;
    header.WriteField(
      HeaderAccessor.headerKey_ChunkSequence,
      currentChunkIndex + 1
    );
    header.WriteField(HeaderAccessor.headerKey_ChunkTotal, totalChunks);
    header.WriteField(HeaderAccessor.headerKey_HasMoreChunks, !isLastChunk);
  }

  static updateContentType(header, type) {
    header.WriteField(HeaderAccessor.headerKey_ContentType, type);
  }

  static updateContentTypeToJson(header) {
    header.WriteField(
      HeaderAccessor.headerKey_ContentType,
      HeaderAccessor.contentType_Json
    );
  }

  static updateMethodName(header, methodName) {
    header.WriteField(HeaderAccessor.headerKey_MethodName, methodName);
  }

  static updateRequestId(header, requestId) {
    header.WriteField(HeaderAccessor.headerKey_RequestId, requestId);
  }

  static updateResponseId(header, responseId) {
    header.WriteField(HeaderAccessor.headerKey_ResponseId, responseId);
  }

  static updateSessionId(header, sessionId) {
    header.WriteField(HeaderAccessor.headerKey_SessionId, sessionId);
  }

  static updateType(header, type) {
    header.WriteField(HeaderAccessor.headerKey_Type, type);
  }

  static updateErrorCode(header, errorCode) {
    header.WriteField(HeaderAccessor.headerKey_ErrorCode, errorCode);
  }
}

module.exports = HeaderAccessor;
