const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const CracoEsbuildPlugin = require("craco-esbuild");
const { ProvidePlugin } = require("webpack");

module.exports = {
  plugins: [{ plugin: CracoEsbuildPlugin }],
  style: {
    postcss: {
      plugins: [require("tailwindcss"), require("autoprefixer")],
    },
  },
  webpack: {
    configure: (config) => {
      config.resolve.extensions.push(".wasm");

      config.module.rules.forEach((rule) => {
        (rule.oneOf || []).forEach((oneOf) => {
          if (oneOf.loader && oneOf.loader.indexOf("file-loader") >= 0) {
            oneOf.exclude.push(/\.wasm$/);
          }
        });
      });

      config.module.rules.push({
        test: /\.js$/,
        use: { loader: require.resolve("@open-wc/webpack-import-meta-loader") },
      });

      return config;
    },
    rules: [
      {
        test: /\.wasm$/,
        loader: "file-loader",
        type: "javascript/auto",
      },
      {
        test: /\.mjs$/,
        type: "javascript/auto",
      },
    ],
    resolve: {
      mainFields: ["main"],
    },
    plugins: {
      add: [
        new MonacoWebpackPlugin(),
        new ProvidePlugin({
          React: "react",
        }),
      ],
    },
  },
};
