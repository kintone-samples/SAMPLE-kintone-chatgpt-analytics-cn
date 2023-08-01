const { resolve } = require('path')
const isDev = process.env.NODE_ENV !== 'production'
const isDebug = process.env.NODE_ENV === 'debug'
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')

const cssLoaders = (preNumber) => [
  isDev && !isDebug ? 'style-loader' : MiniCssExtractPlugin.loader,
  {
    loader: 'css-loader',
    options: {
      sourceMap: isDev,
      importLoaders: preNumber + 1,
    },
  },
  {
    loader: 'postcss-loader',
    options: {
      postcssOptions: {
        plugins: [
          'postcss-flexbugs-fixes',
          [
            'postcss-preset-env',
            {
              autoprefixer: {
                grid: true,
                flexbox: 'no-2009',
              },
            },
          ],
        ],
      },
      sourceMap: isDev,
    },
  },
]

const source = resolve(__dirname, '../src')
const output = resolve(__dirname, '../dist')

module.exports = {
  entry: {
    app: resolve(source, 'index.js'),
  },
  output: {
    filename: `js/[name].js`,
    path: output,
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.json'],
  },
  externals: {
  },
  plugins: [
    new webpack.DefinePlugin({
      process: {
        env: {},
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: { cacheDirectory: true },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: cssLoaders(0),
      },
      {
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/],
        type: 'asset/inline',
      },
      {
        test: /\.(ttf|woff|woff2|eot|otf)$/,
        type: 'asset/inline',
      },
    ],
  },
}
