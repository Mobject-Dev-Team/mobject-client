# Changelog

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
