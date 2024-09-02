# mobject-client

mobject-client is a JavaScript client designed for easy interaction with the mobject-server. It facilitates communication with automation software, specifically designed to work seamlessly with Beckhoff's TwinCAT HMI and NodeJs environments. This package includes two main clients: `AdsRpcClient` for general-purpose use and `TcHmiRpcClient` for integration with TwinCAT HMI projects.

ADS already supports most use cases. This server and client combination was created to provide a true server and client implementation which can be expanded upon. Currently the client and server supports synchronous and asynchronous requests. The amount of data sent in a call is only limited by the ADS router memory. Requests and responses are automatically chunked.

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

- amsNetId: The AMS Net ID of the target machine, defaults to "127.0.0.1.1.1".
- adsPort: The ADS port, defaults to 851.
  symbolName: The symbol name for the API endpoint, defaults to "MAIN.server".
- methodName: The method name to call, defaults to "HandleRequest".
- config: Additional configuration options.

## Parameters Object

The parameters object for rpcCall consists of key-value pairs corresponding to the method's parameters. These can be any JavaScript primitive, array or object, which will be automatically serialized for the call.

# Building for TcHmi (Prior to NuGet package release)

For projects using TwinCAT HMI, where modules cannot be directly used, a bundled distribution file is generated through Webpack:

```bash
npm run build-tchmi-javascript-file
```

In time this will be replaced with an official NuGet package for TwinCAT HMI, but until then you will manually build.

## Using in TwinCAT HMI

You will need to map the HandleRequest method in the server configuration of TwinCAT HMI. Once done, you can create a client and send rpc calls using client.rpcCall().

```javascript
const client = new TcHmiRpcClient("%s%PLC1.MAIN.server.HandleRequest%/s%");

// Make a remote procedure call
const parameters = {
  /* key-value pairs of the parameters */
};
const methodReturnValue = await client.rpcCall("MethodName", parameters);
```

This creates TcHmiRpcClient.bundle.js in the dist folder, which can be included in your TcHmi project.
