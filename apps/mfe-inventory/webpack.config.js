const { ModuleFederationPlugin } = require('webpack').container;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: 'auto',
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
      { test: /\.tsx?$/, use: { loader: 'ts-loader', options: { transpileOnly: true } }, exclude: /node_modules/ },
      { test: /\.css$/, use: ['style-loader', 'css-loader', 'postcss-loader'] },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'mfeInventory',
      filename: 'remoteEntry.js',
      exposes: {
        './ProjectListPage':   './src/project/pages/ProjectListPage',
        './ProjectDetailPage': './src/project/pages/ProjectDetailPage',
      },
      shared: {
        react:            { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom':      { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.27.0' },
      },
    }),
    new HtmlWebpackPlugin({ template: './public/index.html' }),
  ],
  devServer: {
    port: 3001,
    historyApiFallback: true,
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  devtool: isDev ? 'eval-source-map' : false,
};
