# mobject-client

mobject-client is a JavaScript client designed for easy interaction with the mobject-server. It facilitates communication with automation software, specifically designed to work seamlessly with Beckhoff's TwinCAT HMI and NodeJs environments. This package includes two main clients: `AdsRpcClient` for general-purpose use and `TcHmiRpcClient` for integration with TwinCAT HMI projects.

## Installation

```bash
npm install mobject-client
```

# Usage

## Getting Started

In your JavaScript project, require the mobject-client to start interacting with your server.

```javascript
const { AdsRpcClient } = require("mobject-client");
```

## Using AdsRpcClient

The AdsRpcClient is the primary client for most users. Here's how to instantiate and use it:

```javascript
const client = new AdsRpcClient("127.0.0.1.1.1", 851, "Main.server");

// Connect to the server
await client.connect();

// Make a remote procedure call
const parameters = {
  /* key-value pairs of the parameters */
};
const methodReturnValue = await client.rpcCall("MethodName", parameters);
```

## Constructor Parameters

- amsNetId: The AMS Net ID of the target machine.
- adsPort: The ADS port.
  symbolName: The symbol name for the API endpoint, defaults to "MAIN.api".
- methodName: The method name to call, defaults to "HandleRequest".
- config: Additional configuration options.

## Parameters Object

The parameters object for rpcCall consists of key-value pairs corresponding to the method's parameters. These can be any JavaScript primitive, array or object, which will be automatically serialized for the call.

# Building for TcHmi

For projects using TwinCAT HMI, where modules cannot be directly used, a bundled distribution file is generated through Webpack:

```bash
npm run build-tchmi
```

This creates TchmiMobjectClient.bundle.js in the dist folder, which can be included in your TcHmi project.
