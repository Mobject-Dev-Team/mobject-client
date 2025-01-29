const TaskQueue = require("./TaskQueue");
const HeaderAccessor = require("./HeaderAccessor");
const Header = require("./Header");
const SequentialRequestIdGenerator = require("./SequentialRequestIdGenerator");

class AsyncClient {
  #serverConnectionStrategy;
  #activeRequests = new Map();
  #timeout;
  #stackSize;
  #chunkSize;
  #debug = false;
  #sessionId = null;
  #idGenerator = new SequentialRequestIdGenerator();
  #taskQueue = new TaskQueue();

  #STATUS = {
    ACCEPTED: "Accepted", // returned when a partial chunked request is received
    PENDING: "Pending", // returned when a complete request is received and no sync reply is available
    BUSY: "Busy", // only returned on the initial request if the server is busy
    SUCCESS: "Success", // returned to indicate a full or chunked reply is collected successfully
    ERROR: "Error", // returned at any stage to indicate a problem which causes the process to fail
  };

  #log(...args) {
    if (!this.#debug) return;
    console.log(...args);
  }

  constructor(serverConnectionStrategy, config = {}) {
    this.#serverConnectionStrategy = serverConnectionStrategy;

    this.#stackSize = config.stackSize || 64000;
    this.#chunkSize = config.chunkSize || this.#stackSize / 8;
    this.#timeout = config.timeout || 5000;
  }

  async request(
    header = new Header(),
    payload,
    marshaller,
    timeout = this.#timeout
  ) {
    const serializedPayload = marshaller.marshall(header, payload);

    const requestId = this.#createActiveRequestEntry();
    HeaderAccessor.updateRequestId(header, requestId);

    this.#enqueueRequest(requestId, header, serializedPayload);
    const serializedResponse = await this.#createPromiseWithTimeout(
      requestId,
      timeout
    );
    return marshaller.unmarshall(serializedResponse);
  }

  #createActiveRequestEntry() {
    const id = this.#idGenerator.generate();
    this.#activeRequests.set(id, { resolve: null, reject: null, chunks: [] });
    return id;
  }

  #createPromiseWithTimeout(id, timeout) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Call ${id} timed out`));
        this.#deleteActiveRequestEntry(id);
      }, timeout);
    });

    return Promise.race([timeoutPromise, this.#createPromise(id, timeoutId)]);
  }

  #createPromise(id, timeoutId) {
    return new Promise((resolve, reject) => {
      const rpcCall = this.#activeRequests.get(id);
      if (rpcCall) {
        rpcCall.reject = (reason) => {
          clearTimeout(timeoutId);
          this.#deleteActiveRequestEntry(id);
          reject(reason);
        };
        rpcCall.resolve = (payload) => {
          clearTimeout(timeoutId);
          this.#deleteActiveRequestEntry(id);
          resolve(payload);
        };
      } else {
        throw new Error(`Call ${id} not found`);
      }
    });
  }

  #deleteActiveRequestEntry(id) {
    if (this.#activeRequests.has(id)) {
      this.#activeRequests.delete(id);
    }
  }

  async #enqueueRequest(id, header, serializedPayload) {
    const chunkedPayload = this.#chunkSerializedPayload(serializedPayload);
    const totalChunks = chunkedPayload.length;

    for (let index = 0; index < totalChunks; ) {
      if (this.#idHasExpired(id)) {
        return;
      }

      HeaderAccessor.updateChunkInformation(header, index, totalChunks);
      try {
        const response = await this.#enqueueAndDispatch(
          header,
          chunkedPayload[index]
        );
        this.#log("Initial Response:", JSON.stringify(response));

        const shouldRetry = await this.#handleResponseBasedOnStatus(
          response,
          id,
          header
        );
        if (!shouldRetry) {
          index++;
        }
      } catch (error) {
        this.#handleSpecificErrors(error, id);
      }
    }
  }

  #chunkSerializedPayload(serializedPayload) {
    const chunks = [];
    for (let i = 0; i < serializedPayload.length; i += this.#chunkSize) {
      chunks.push(serializedPayload.slice(i, i + this.#chunkSize));
    }
    return chunks;
  }

  #idHasExpired(id) {
    return !this.#activeRequests.has(id);
  }

  #enqueueAndDispatch(header, chunk) {
    return this.#taskQueue.enqueue(() => this.#dispatchRequest(header, chunk));
  }

  #handleSpecificErrors(error, id) {
    this.#handleFailure(id, `An error occurred: ${error.message}`);
  }

  async #handleResponseBasedOnStatus(response, id, header) {
    const status = HeaderAccessor.readStatus(response.header);
    switch (status) {
      case this.#STATUS.ACCEPTED:
        return false;
      case this.#STATUS.PENDING:
        this.#handlePendingResponse(id, header, response);
        return false;
      case this.#STATUS.BUSY:
        await this.#handleServerIsBusy(response);
        return true;
      case this.#STATUS.SUCCESS:
        this.#handleSuccessfulRequest(id, header, response);
        return false;
      case this.#STATUS.ERROR:
      default:
        this.#handleFailure(id, HeaderAccessor.readMessage(response.header));
        return false;
    }
  }

  async #handleServerIsBusy(response) {
    retryDelay = HeaderAccessor.readRetryDelay(response.header);
    await this.#delayExecution(retryDelay);
  }

  async #delayExecution(delayTimeInMs) {
    return new Promise((resolve) => {
      const delay = Math.max(0, Number(delayTimeInMs) || 0);
      if (delay > 0) {
        this.#log(`Delaying for ${delay}ms based on server response`);
        setTimeout(resolve, delay);
      } else {
        resolve();
      }
    });
  }

  async #handleSuccessfulRequest(id, header, response) {
    const activeRequest = this.#activeRequests.get(id);
    if (!activeRequest) {
      return;
    }

    this.#updateActiveRequestPayload(activeRequest, response);

    if (HeaderAccessor.readHasMoreChunks(response.header)) {
      const responseId = HeaderAccessor.readResponseId(response.header);
      const retryDelay = HeaderAccessor.readRetryDelay(response.header);
      await this.#prepareAndEnqueueFollowup(id, header, responseId, retryDelay);
    } else {
      activeRequest.resolve(activeRequest.chunks.join(""));
    }
  }

  #updateActiveRequestPayload(activeRequest, response) {
    const receivedPayload = response.payload;
    activeRequest.chunks.push(receivedPayload);
  }

  async #handlePendingResponse(id, header, response) {
    const responseId = HeaderAccessor.readResponseId(response.header);
    const retryDelay = HeaderAccessor.readRetryDelay(response.header);
    await this.#prepareAndEnqueueFollowup(id, header, responseId, retryDelay);
  }

  async #prepareAndEnqueueFollowup(id, header, responseId, retryDelay = 0) {
    if (!responseId) {
      this.#handleFailure(
        id,
        `No Response-Id returned from server for request ${id}. All follow-ups must have a Response-Id.`
      );
      return;
    }

    HeaderAccessor.updateResponseId(header, responseId);
    await this.#delayExecution(retryDelay);
    this.#enqueueFollowup(id, header);
  }

  async #enqueueFollowup(id, header) {
    let retryCount = 0;
    const maxRetries = 5;
    let shouldRetry;
    do {
      try {
        if (this.#idHasExpired(id)) return;

        const response = await this.#taskQueue.enqueue(() =>
          this.#dispatchRequest(header)
        );
        this.#log(
          `Reply from Server from Follow-up for id ${id}:`,
          JSON.stringify(response)
        );

        shouldRetry = await this.#handleResponseBasedOnStatus(
          response,
          id,
          header
        );

        retryCount++;
        if (shouldRetry && retryCount > maxRetries) {
          this.#handleFailure(id, "Maximum retry attempts exceeded");
          shouldRetry = false;
        }
      } catch (error) {
        this.#handleFailure(id, `An error occurred: ${error.message}`);
        shouldRetry = false;
      }
    } while (shouldRetry);
  }

  async #dispatchRequest(header, serializedPayload = "") {
    if (this.#sessionId) {
      HeaderAccessor.updateSessionId(header, this.#sessionId);
    }

    this.#log("Dispatching Request :", {
      header: JSON.stringify(header),
      serializedPayload,
    });

    const rawResponse = await this.#serverConnectionStrategy.request(
      header.toString(),
      serializedPayload
    );

    const response = this.#processServerResponse(rawResponse);
    this.#updateSessionIdFromServerResponse(response);
    return response;
  }

  #processServerResponse(serverResponse) {
    const header = new Header(serverResponse.Header);
    const response = { header };

    if (serverResponse.Payload != null && serverResponse.Payload !== "") {
      response.payload = serverResponse.Payload;
    }

    return response;
  }

  #updateSessionIdFromServerResponse(response) {
    const sessionId = HeaderAccessor.readSessionId(response.header);
    if (sessionId) {
      this.#sessionId = sessionId;
    }
  }

  #handleFailure(id, message) {
    const request = this.#activeRequests.get(id);
    if (request) {
      const modifiedError = new Error(`Call ${id}: ${message}`);
      request.reject(modifiedError);
    }
  }
}

module.exports = AsyncClient;
