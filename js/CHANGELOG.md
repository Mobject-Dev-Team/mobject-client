# Changelog

## v2.4.0 - 03-08-2026

- Changed, the per-call `timeout` is now an inactivity timeout rather than a budget for the whole call. It is the longest the client will wait without hearing anything back about a request. Every reply - `Accepted`, `Pending`, a delivered chunk - proves the server is alive and working, and restarts the clock. A long operation that keeps reporting progress is no longer cancelled for taking too long; only silence fails it. This is strictly more permissive than the previous behaviour, so calls that succeeded before still succeed.
- Added, `maxDuration` option on the client config. An absolute ceiling on a whole call, as a backstop against a server that stays responsive but never finishes. Off by default, because the intended guard for that case is a deadline on the server, which can tell the difference between slow work and stuck work.
- Added, timeout rejections now carry a `code` so the two cases can be told apart - `TIMEOUT_INACTIVITY` and `TIMEOUT_MAX_DURATION` - alongside the existing `requestId`.

Example.

``new AdsRpcClient("192.168.10.20.1.1", 851, "Main.server", "HandleRequest", { timeout: 10000, maxDuration: 600000 });``

## v2.3.0 - 03-07-2026

- Added, `clientSettings` option on the AdsRpcClient config. This is merged into the underlying ads-client `Client` settings, enabling router-less connections from machines without a local TwinCAT AMS router (e.g. Linux) via `routerAddress`, `localAmsNetId` and `localAdsPort`. See the README section "Connecting without a local ADS router" for details.

Example.

``new AdsRpcClient("192.168.10.20.1.1", 851, "Main.server", "HandleRequest", { clientSettings: { routerAddress: "192.168.10.20", localAmsNetId: "192.168.10.50.1.1", localAdsPort: 32750 } });``

## v2.2.0 - 14-05-2025

- Changed, Server responses now include an ErrorCode header for structured error handling.
- Changed, Header "Message" is now "Error-Message".
- Added, Client error handling updated to extract and use ErrorCode and requestId as separate fields on the error object for clearer diagnostics and retry logic.

Example.

`` console.error(`Error [${err.code}] in call ${err.requestId}: ${err.message}`);``

## v2.1.0 - 30-01-2025

- Optimized chunking
- Optimized payload collection
- Protected retries

## v2.0.0 - 03-09-2024

### Changed

- MobjectRpcClient is now TcHmiRpcClient.
- Simplified connection for AdsRpcClient.
- New defaults for AdsRpcClient.
  - AmsNetId default "127.0.0.1.1.1"
  - Port default 851
  - Symbol default "server"
- New defaults for TcHmiRpcClient.
  - Symbol default "server"

### Fixed

- Json handling

## v1.0.0 - 9-3-2024

Initial release
