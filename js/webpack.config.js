const path = require("path");

module.exports = {
  entry: "./src/clients/TcHmiRpcClient.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "TcHmiRpcClient.bundle.js",
    library: "TcHmiRpcClient",
    libraryTarget: "var",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};
