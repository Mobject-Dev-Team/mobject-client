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

await client.connect();

const parameters = {
  /* key-value pairs of the parameters */
};

try {
  const methodReturnValue = await client.rpcCall("MethodName", parameters);
  console.log("RPC call succeeded:", methodReturnValue);
} catch (error) {
  console.error("RPC call failed:");
  console.error("Request ID", error.requestId);
  console.error("Error code", error.code);
  console.error("Error message:", error.message);
}
```

## Constructor Parameters

- amsNetId: The AMS Net ID of the target machine, defaults to "127.0.0.1.1.1".
- adsPort: The ADS port, defaults to 851.
- symbolName: The symbol name for the API endpoint, defaults to "MAIN.server".
- methodName: The method name to call, defaults to "HandleRequest".
- config: Additional configuration options.
  - clientSettings: Optional settings object merged into the underlying [ads-client](https://github.com/jisotalo/ads-client) `Client` settings. Use this to access any ads-client option not covered by the constructor parameters, such as the router-less connection settings shown below.

## Connecting without a local ADS router (e.g. Linux)

By default the client connects through the local TwinCAT AMS router on `127.0.0.1:48898`. On machines without a TwinCAT installation (typically Linux servers) there is no local router, so the connection fails with `ECONNREFUSED 127.0.0.1:48898`. In that case, connect straight to the target's router using `clientSettings`:

```javascript
const client = new AdsRpcClient(
  "192.168.10.20.1.1", // target AMS Net ID
  851,
  "Main.server",
  "HandleRequest",
  {
    clientSettings: {
      routerAddress: "192.168.10.20", // IP of the target machine
      routerTcpPort: 48898,
      localAmsNetId: "192.168.10.50.1.1", // this machine's IP as an AMS Net ID
      localAdsPort: 32750, // any free local ADS port
    },
  }
);
```

The target machine must have a static AMS route back to this machine, or it will silently drop the AMS frames (the connection then fails with a "Device system manager state read failed" timeout). Add the route on the target with TwinCAT XAE (SYSTEM → Routes → Add) or in `StaticRoutes.xml`, using the same `localAmsNetId` and this machine's IP address.

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

try {
  const methodReturnValue = await client.rpcCall("MethodName", parameters);
  console.log("RPC call succeeded:", methodReturnValue);
} catch (error) {
  console.error("RPC call failed:");
  console.error("Request ID", error.requestId);
  console.error("Error code", error.code);
  console.error("Error message:", error.message);
}
```

This creates TcHmiRpcClient.bundle.js in the dist folder, which can be included in your TcHmi project.
