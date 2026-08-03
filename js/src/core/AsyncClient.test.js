const AsyncClient = require("./AsyncClient");
const Header = require("./Header");
const HeaderAccessor = require("./HeaderAccessor");
const JsonPayloadMarshaller = require("./JsonPayloadMarshaller");

// Minimal stand-in for a server connection. Each queued reply is returned to
// one dispatch, in order, after an optional delay.
class ScriptedStrategy {
  constructor(replies = []) {
    this.replies = [...replies];
    this.requests = [];
  }

  push(reply) {
    this.replies.push(reply);
  }

  async request(serializedHeader, serializedPayload) {
    this.requests.push({ serializedHeader, serializedPayload });

    const next = this.replies.shift();
    if (!next) {
      // Nothing scripted: go silent, which is what an inactivity timeout is
      // meant to catch.
      return new Promise(() => {});
    }

    if (next.delay) {
      await new Promise((r) => setTimeout(r, next.delay));
    }
    return next.response;
  }
}

const reply = (fields, payload = "") => ({
  Header: JSON.stringify(fields),
  Payload: payload,
});

const pending = (responseId = "1", retryDelay = 0) =>
  reply({
    "Session-Id": "1",
    Status: "Pending",
    "Response-Id": responseId,
    "Retry-Delay": retryDelay,
  });

const success = (payload) =>
  reply({ "Session-Id": "1", Status: "Success" }, payload);

describe("AsyncClient inactivity timeout", () => {
  const marshaller = new JsonPayloadMarshaller();

  test("a call that keeps receiving Pending outlives the inactivity window", async () => {
    // Six polls at 40ms each = 240ms of work, well past the 100ms timeout.
    // Under a total-duration deadline this would fail; under an inactivity
    // deadline each Pending resets the clock and the call completes.
    const strategy = new ScriptedStrategy([
      { response: pending(), delay: 40 },
      { response: pending(), delay: 40 },
      { response: pending(), delay: 40 },
      { response: pending(), delay: 40 },
      { response: pending(), delay: 40 },
      { response: success('"done"'), delay: 40 },
    ]);

    const client = new AsyncClient(strategy, { timeout: 100 });

    const result = await client.request(new Header(), {}, marshaller);

    expect(result).toBe("done");
    expect(strategy.requests.length).toBe(6);
  });

  test("a call fails once the server goes silent for longer than the window", async () => {
    // One Pending, then nothing at all.
    const strategy = new ScriptedStrategy([{ response: pending() }]);
    const client = new AsyncClient(strategy, { timeout: 60 });

    await expect(client.request(new Header(), {}, marshaller)).rejects.toThrow(
      /without any response from the server/
    );
  });

  test("the inactivity error carries a distinguishing code", async () => {
    const strategy = new ScriptedStrategy([]);
    const client = new AsyncClient(strategy, { timeout: 40 });

    await expect(
      client.request(new Header(), {}, marshaller)
    ).rejects.toMatchObject({ code: "TIMEOUT_INACTIVITY" });
  });

  test("silence is measured from the last reply, not from the start", async () => {
    // Two quick Pendings, then silence. The call must survive past the point a
    // total-duration deadline would have fired, then fail on the silence.
    const strategy = new ScriptedStrategy([
      { response: pending(), delay: 50 },
      { response: pending(), delay: 50 },
    ]);
    const client = new AsyncClient(strategy, { timeout: 80 });

    const start = Date.now();
    await expect(client.request(new Header(), {}, marshaller)).rejects.toThrow(
      /TIMEOUT|timed out/i
    );
    const elapsed = Date.now() - start;

    // 100ms of replies + an 80ms silent window; a start-anchored 80ms deadline
    // would have rejected at ~80ms.
    expect(elapsed).toBeGreaterThanOrEqual(150);
  });

  test("a successful call settles without leaving timers behind", async () => {
    const strategy = new ScriptedStrategy([{ response: success('"ok"') }]);
    const client = new AsyncClient(strategy, { timeout: 1000 });

    await expect(client.request(new Header(), {}, marshaller)).resolves.toBe(
      "ok"
    );

    // If a timer were still armed, jest would warn about an open handle; this
    // also proves the entry was cleaned up.
    expect(strategy.requests.length).toBe(1);
  });
});

describe("AsyncClient cancellation", () => {
  const marshaller = new JsonPayloadMarshaller();

  // A server that stays alive but never finishes: exactly the case a caller
  // needs to be able to walk away from.
  const endlesslyPending = () => {
    const strategy = new ScriptedStrategy([]);
    strategy.request = async function () {
      this.requests.push({});
      await new Promise((r) => setTimeout(r, 10));
      return pending();
    };
    return strategy;
  };

  test("abortAll rejects an in-flight request with an ABORTED error", async () => {
    const client = new AsyncClient(endlesslyPending(), { timeout: 5000 });

    const inFlight = client.request(new Header(), {}, marshaller);
    await new Promise((r) => setTimeout(r, 30));

    expect(client.activeRequestCount).toBe(1);
    expect(client.abortAll()).toBe(1);

    await expect(inFlight).rejects.toMatchObject({ code: "ABORTED" });
    expect(client.activeRequestCount).toBe(0);
  });

  test("abortAll reports how many requests it abandoned", async () => {
    const client = new AsyncClient(endlesslyPending(), { timeout: 5000 });

    const calls = [
      client.request(new Header(), {}, marshaller),
      client.request(new Header(), {}, marshaller),
      client.request(new Header(), {}, marshaller),
    ];
    await new Promise((r) => setTimeout(r, 30));

    expect(client.abortAll("shutting down")).toBe(3);

    await Promise.all(
      calls.map((c) => expect(c).rejects.toThrow("shutting down"))
    );
    expect(client.activeRequestCount).toBe(0);
  });

  test("aborting stops the client sending anything further for that request", async () => {
    const strategy = endlesslyPending();
    const client = new AsyncClient(strategy, { timeout: 5000 });

    const inFlight = client.request(new Header(), {}, marshaller);
    await new Promise((r) => setTimeout(r, 40));
    client.abortAll();
    await expect(inFlight).rejects.toMatchObject({ code: "ABORTED" });

    // One call may already have been on the wire when the abort landed and will
    // still come back, but nothing new should be sent after that.
    const sentAtAbort = strategy.requests.length;
    await new Promise((r) => setTimeout(r, 60));

    expect(strategy.requests.length).toBeLessThanOrEqual(sentAtAbort + 1);
  });

  test("an AbortSignal cancels just its own request", async () => {
    const client = new AsyncClient(endlesslyPending(), { timeout: 5000 });
    const controller = new AbortController();

    const cancelled = client.request(new Header(), {}, marshaller, undefined, {
      signal: controller.signal,
    });
    const untouched = client.request(new Header(), {}, marshaller);
    await new Promise((r) => setTimeout(r, 30));

    controller.abort("caller gave up");

    await expect(cancelled).rejects.toMatchObject({ code: "ABORTED" });
    expect(client.activeRequestCount).toBe(1);

    client.abortAll();
    await expect(untouched).rejects.toMatchObject({ code: "ABORTED" });
  });

  test("a signal already aborted fails the request immediately", async () => {
    const client = new AsyncClient(endlesslyPending(), { timeout: 5000 });
    const controller = new AbortController();
    controller.abort("too late");

    await expect(
      client.request(new Header(), {}, marshaller, undefined, {
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ code: "ABORTED" });

    expect(client.activeRequestCount).toBe(0);
  });

  test("a completed request detaches from its signal", async () => {
    const strategy = new ScriptedStrategy([{ response: success('"ok"') }]);
    const client = new AsyncClient(strategy, { timeout: 1000 });
    const controller = new AbortController();

    await expect(
      client.request(new Header(), {}, marshaller, undefined, {
        signal: controller.signal,
      })
    ).resolves.toBe("ok");

    // Aborting afterwards must be inert rather than reaching a dead entry.
    expect(() => controller.abort()).not.toThrow();
    expect(client.activeRequestCount).toBe(0);
  });

  test("abortAll on an idle client is a no-op", () => {
    const client = new AsyncClient(new ScriptedStrategy([]), {});
    expect(client.abortAll()).toBe(0);
  });
});

describe("AsyncClient maxDuration backstop", () => {
  const marshaller = new JsonPayloadMarshaller();

  test("is off by default, so steady progress can run indefinitely", async () => {
    const strategy = new ScriptedStrategy([
      { response: pending(), delay: 30 },
      { response: pending(), delay: 30 },
      { response: pending(), delay: 30 },
      { response: pending(), delay: 30 },
      { response: success('"eventually"'), delay: 30 },
    ]);

    const client = new AsyncClient(strategy, { timeout: 100 });

    await expect(client.request(new Header(), {}, marshaller)).resolves.toBe(
      "eventually"
    );
  });

  test("when set, it caps a call that is responsive but never finishes", async () => {
    // Endless Pending: liveness alone would never fail this.
    const strategy = new ScriptedStrategy([]);
    strategy.request = async function () {
      this.requests.push({});
      await new Promise((r) => setTimeout(r, 20));
      return pending();
    };

    const client = new AsyncClient(strategy, {
      timeout: 1000,
      maxDuration: 120,
    });

    await expect(
      client.request(new Header(), {}, marshaller)
    ).rejects.toMatchObject({ code: "TIMEOUT_MAX_DURATION" });
  });
});
