const TaskQueue = require("./TaskQueue");
const HeaderAccessor = require("./HeaderAccessor");
const Header = require("./Header");
const SequentialRequestIdGenerator = require("./SequentialRequestIdGenerator");

class AsyncClient {
  #serverConnectionStrategy;
  #activeRequests = new Map();
  #timeout;
  #maxDuration;
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

    this.#chunkSize = config.chunkSize || 8000;

    // Inactivity timeout: the longest the client will wait without hearing
    // anything back from the server about this request. It is NOT a budget for
    // the whole call. Every reply - Accepted, Pending, a delivered chunk -
    // proves the server is alive and working, and starts the clock again. A
    // long operation that keeps reporting progress is allowed to keep running;
    // only silence fails it.
    this.#timeout = config.timeout || 5000;

    // Optional absolute ceiling on a whole call, as a backstop against a server
    // that stays responsive but never finishes. Off by default: the intended
    // guard for that case is a deadline on the server, which can tell the
    // difference between slow work and stuck work. Set a value here only if a
    // hard client-side limit is genuinely wanted.
    this.#maxDuration = config.maxDuration ?? null;
  }

  configure(chunkSize) {
    this.#chunkSize = chunkSize;
  }

  async request(
    header = new Header(),
    payload,
    marshaller,
    timeout = this.#timeout,
    options = {}
  ) {
    const serializedPayload = marshaller.marshall(header, payload);

    const requestId = this.#createActiveRequestEntry();
    HeaderAccessor.updateRequestId(header, requestId);

    this.#enqueueRequest(requestId, header, serializedPayload);
    const serializedResponse = await this.#createRequestPromise(
      requestId,
      timeout,
      options.signal
    );
    return marshaller.unmarshall(serializedResponse);
  }

  // Abandon every request still in flight. The dispatch and poll loops check
  // whether their request is still active before each step, so dropping the
  // entries is what stops them.
  //
  // One ADS call already on the wire will still run to completion - there is no
  // way to recall it - but its result is discarded and nothing further is sent
  // for that request.
  abortAll(reason = "The client aborted all in-flight requests") {
    const ids = Array.from(this.#activeRequests.keys());

    for (const id of ids) {
      this.#abortRequest(id, reason);
    }

    return ids.length;
  }

  abort(requestId, reason = "The request was aborted") {
    return this.#abortRequest(requestId, reason);
  }

  get activeRequestCount() {
    return this.#activeRequests.size;
  }

  #abortRequest(id, reason) {
    const rpcCall = this.#activeRequests.get(id);

    if (!rpcCall) {
      return false;
    }

    // reject() is only installed once the caller's promise exists. If a request
    // is somehow aborted before that, drop the entry directly so its loops
    // still stop.
    if (typeof rpcCall.reject !== "function") {
      this.#deleteActiveRequestEntry(id);
      return true;
    }

    rpcCall.reject(this.#createAbortError(id, reason));
    return true;
  }

  #createAbortError(id, reason) {
    const error = new Error(
      typeof reason === "string" && reason !== ""
        ? reason
        : `Call ${id} was aborted`
    );
    error.code = "ABORTED";
    error.requestId = id;
    return error;
  }

  #createActiveRequestEntry() {
    const id = this.#idGenerator.generate();
    this.#activeRequests.set(id, { resolve: null, reject: null, chunks: [] });
    return id;
  }

  #createRequestPromise(id, inactivityTimeout, signal) {
    return new Promise((resolve, reject) => {
      const rpcCall = this.#activeRequests.get(id);

      if (!rpcCall) {
        reject(new Error(`Call ${id} not found`));
        return;
      }

      const settleWith = (finish) => (value) => {
        this.#clearRequestTimers(rpcCall);
        this.#detachSignal(rpcCall);
        this.#deleteActiveRequestEntry(id);
        finish(value);
      };

      rpcCall.resolve = settleWith(resolve);
      rpcCall.reject = settleWith(reject);

      rpcCall.inactivityTimeout = inactivityTimeout;
      rpcCall.onInactive = () => {
        const error = new Error(
          `Call ${id} timed out after ${inactivityTimeout}ms without any response from the server`
        );
        error.code = "TIMEOUT_INACTIVITY";
        error.requestId = id;
        rpcCall.reject(error);
      };
      this.#restartInactivityTimer(id);

      if (this.#maxDuration != null) {
        rpcCall.maxDurationTimer = setTimeout(() => {
          const error = new Error(
            `Call ${id} exceeded the maximum duration of ${this.#maxDuration}ms`
          );
          error.code = "TIMEOUT_MAX_DURATION";
          error.requestId = id;
          rpcCall.reject(error);
        }, this.#maxDuration);
      }

      if (signal) {
        if (signal.aborted) {
          rpcCall.reject(this.#createAbortError(id, signal.reason));
          return;
        }

        const onAbort = () => this.#abortRequest(id, signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
        rpcCall.detachSignal = () =>
          signal.removeEventListener("abort", onAbort);
      }
    });
  }

  #detachSignal(rpcCall) {
    if (typeof rpcCall.detachSignal !== "function") {
      return;
    }

    rpcCall.detachSignal();
    rpcCall.detachSignal = null;
  }

  // Called whenever the server says anything at all about a request. Proof of
  // life, so the inactivity deadline starts again from now.
  #restartInactivityTimer(id) {
    const rpcCall = this.#activeRequests.get(id);

    // The entry exists from the moment the request is created, but its timers
    // are only armed once the caller's promise is built. Nothing can reply that
    // early in practice, so this is just a guard against the ordering changing.
    if (!rpcCall || typeof rpcCall.onInactive !== "function") {
      return;
    }

    clearTimeout(rpcCall.inactivityTimer);
    rpcCall.inactivityTimer = setTimeout(
      rpcCall.onInactive,
      rpcCall.inactivityTimeout
    );
  }

  #clearRequestTimers(rpcCall) {
    clearTimeout(rpcCall.inactivityTimer);
    clearTimeout(rpcCall.maxDurationTimer);
  }

  #deleteActiveRequestEntry(id) {
    this.#activeRequests.delete(id);
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
    if (serializedPayload.length === 0) {
      return [""];
    }
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
    // Every reply routed through here - Accepted, Pending, Busy, a delivered
    // chunk - is evidence the server is alive and still working on this
    // request, so the inactivity deadline is pushed back.
    this.#restartInactivityTimer(id);

    const status = HeaderAccessor.readStatus(response.header);
    switch (status) {
      case this.#STATUS.ACCEPTED:
        return false;
      case this.#STATUS.PENDING:
        await this.#handlePendingResponse(id, header, response);
        return false;
      case this.#STATUS.BUSY:
        await this.#handleServerIsBusy(response);
        return true;
      case this.#STATUS.SUCCESS:
        await this.#handleSuccessfulRequest(id, header, response);
        return false;
      case this.#STATUS.ERROR:
      default:
        this.#handleFailure(
          id,
          HeaderAccessor.readErrorMessage(response.header),
          response.header
        );
        return false;
    }
  }

  async #handleServerIsBusy(response) {
    const retryDelay = HeaderAccessor.readRetryDelay(response.header);
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

  #handleFailure(id, message, header = null) {
    const request = this.#activeRequests.get(id);
    if (request) {
      const error = new Error(message);
      error.requestId = id;
      error.code = header ? HeaderAccessor.readErrorCode(header) : null;

      request.reject(error);
    }
  }
}

module.exports = AsyncClient;
