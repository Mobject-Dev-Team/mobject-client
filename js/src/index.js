// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
// <reference path='./../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.44/runtimes/native1.12-tchmi/TcHmi.d.ts' />

const AdsRpcClient = require("./clients/AdsRpcClient");
const TcHmiRpcClient = require("./clients/TcHmiRpcClient");

module.exports = {
  AdsRpcClient,
  TcHmiRpcClient,
};
