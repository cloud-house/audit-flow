const { ModuleFederationPlugin } = require('webpack').container;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

const MFE_URLS = {
  mfeInventory: process.env.MFE_INVENTORY_URL || 'http://localhost:3001',
  mfeAnalyzer:  process.env.MFE_ANALYZER_URL  || 'http://localhost:3002',
  mfeReports:   process.env.MFE_REPORTS_URL   || 'http://localhost:3003',
};

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@auditflow/types':     path.resolve(__dirname, '../../packages/types/src'),
      '@auditflow/event-bus': path.resolve(__dirname, '../../packages/event-bus/src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: { loader: 'ts-loader', options: { transpileOnly: true } },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        mfeInventory: `mfeInventory@${MFE_URLS.mfeInventory}/remoteEntry.js`,
        mfeAnalyzer:  `mfeAnalyzer@${MFE_URLS.mfeAnalyzer}/remoteEntry.js`,
        mfeReports:   `mfeReports@${MFE_URLS.mfeReports}/remoteEntry.js`,
      },
      shared: {
        react:            { singleton: true, requiredVersion: '^18.3.1', eager: false },
        'react-dom':      { singleton: true, requiredVersion: '^18.3.1', eager: false },
        'react-router-dom': { singleton: true, requiredVersion: '^6.27.0', eager: false },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  devtool: isDev ? 'eval-source-map' : false,
};
