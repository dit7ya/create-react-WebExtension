// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
// @remove-on-eject-end
'use strict';

const autoprefixer = require('autoprefixer');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
const eslintFormatter = require('react-dev-utils/eslintFormatter');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const getClientEnvironment = require('./env');

module.exports = (bundle, hotReloadServerUrl) => {
  const { servedPath, buildPath, indexJs } = bundle;
  // These paths are global to the project and do not vary between bundles.
  const { appTsConfig, appSrc, appNodeModules } = require('./paths');
  // `publicUrl` is just like `publicPath`, but we will provide it to our app
  // as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
  // Omit trailing slash as %PUBLIC_PATH%/xyz looks better than %PUBLIC_PATH%xyz.
  const publicUrl = servedPath.slice(0, -1);
  // Env variables that will be injected into the app.
  const clientEnv = getClientEnvironment(publicUrl);
  // Some apps do not use client-side routing with pushState.
  // For these, "homepage" can be set to "." to enable relative asset paths.
  const shouldUseRelativeAssetPaths = servedPath === './';
  // Note: defined here because it will be used more than once.
  const cssFilename = 'css/[name].css';
  // ExtractTextPlugin expects the build output to be flat.
  // (See https://github.com/webpack-contrib/extract-text-webpack-plugin/issues/27)
  // However, our output is structured with css, js and media folders.
  // To have this structure working with relative paths, we have to use custom options.
  const extractTextPluginOptions = shouldUseRelativeAssetPaths
    ? // Making sure that the publicPath goes back to to build folder.
      { publicPath: Array(cssFilename.split('/').length).join('../') }
    : {};

  let plugins =
    bundle.indexHtml !== null
      ? [
          // Makes some environment variables available in index.html.
          // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
          // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
          // In development, this will be an empty string.
          new InterpolateHtmlPlugin(clientEnv.raw),
          // Generates an `index.html` file with the <script> injected.
          new HtmlWebpackPlugin({
            inject: true,
            template: bundle.indexHtml,
          }),
        ]
      : [];

  // This is the development configuration.
  // It is focused on developer experience and fast rebuilds.
  // The production configuration is different and lives in a separate file.
  return {
    // You may want 'eval' instead if you prefer to see the compiled output in DevTools.
    // See the discussion in https://github.com/facebookincubator/create-react-app/issues/343.
    devtool: 'cheap-module-source-map',
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    // The first two entry points enable "hot" CSS and auto-refreshes for JS.
    entry: [
      // Include an alternative client for WebpackDevServer. A client's job is to
      // connect to WebpackDevServer by a socket and get notified about changes.
      // When you save a file, the client will reload the extension.
      // We need to know the absolute url since we can't use window.location to infer
      // it, since the client is running as an extension content or background script
      // window.location will be something like moz-extension://a2c1a3gf4a2c1a3gf4/rel/index.html
      require.resolve('../lib/hot-reload/client') +
        `?server_url=${encodeURIComponent(hotReloadServerUrl)}`,
      // We ship a few polyfills by default:
      require.resolve('./polyfills'),
      // Errors should be considered fatal in development
      require.resolve('react-error-overlay'),
      // Finally, this is your app's code:
      indexJs,
      // We include the app code last so that if there is a runtime error during
      // initialization, it doesn't blow up the WebpackDevServer client, and
      // changing JS code would still trigger a refresh.
    ],
    output: {
      // Next line is not used in dev but WebpackDevServer crashes without it:
      path: buildPath,
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: true,
      // This does not produce a real file. It's just the virtual path that is
      // served by WebpackDevServer in development. This is the JS bundle
      // containing code from all our entry points, and the Webpack runtime.
      filename: 'js/[name].js',
      // There are also additional JS chunk files if you use code splitting.
      chunkFilename: 'js/[name].chunk.js',
      // This is the URL that app is served from.
      publicPath: servedPath,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: info =>
        path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
    },
    resolve: {
      // This allows you to set a fallback for where Webpack should look for modules.
      // We placed these paths second because we want `node_modules` to "win"
      // if there are any conflicts. This matches Node resolution mechanism.
      // https://github.com/facebookincubator/create-react-app/issues/253
      // NOTE: NODE_PATH is not used by TypeScript.
      modules: ['node_modules', appNodeModules].concat(
        // It is guaranteed to exist because we tweak it in `env.js`
        process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
      ),
      // These are the reasonable defaults supported by the Node ecosystem.
      // We also include JSX as a common component filename extension to support
      // some tools, although we do not recommend using it, see:
      // https://github.com/facebookincubator/create-react-app/issues/290
      // `web` extension prefixes have been added for better support
      // for React Native Web.
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        // @remove-on-eject-begin
        // Resolve Babel runtime relative to react-scripts.
        // It usually still works on npm 3 without this but it would be
        // unfortunate to rely on, as react-scripts could be symlinked,
        // and thus babel-runtime might not be resolvable from the source.
        'babel-runtime': path.dirname(
          require.resolve('babel-runtime/package.json')
        ),
        // @remove-on-eject-end
        // Support React Native Web
        // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
        'react-native': 'react-native-web',
      },
      plugins: [
        // Prevents users from importing files from outside of src/ (or node_modules/).
        // This often causes confusion because we only process files within src/ with babel.
        // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
        // please link the files into your node_modules/ and let module-resolution kick in.
        // Make sure your source files are compiled, as they will not be processed in any way.
        // DISABLING for now due to
        // new ModuleScopePlugin(appSrc),
      ],
    },
    module: {
      strictExportPresence: true,
      rules: [
        // TODO: Disable require.ensure as it's not a standard language feature.
        // We are waiting for https://github.com/facebookincubator/create-react-app/issues/2176.
        // { parser: { requireEnsure: false } },

        // First, run the linter.
        // It's important to do this before Babel processes the JS.
        {
          test: /\.(js|jsx)$/,
          enforce: 'pre',
          use: [
            {
              options: {
                formatter: eslintFormatter,
                // @remove-on-eject-begin
                baseConfig: {
                  extends: [require.resolve('eslint-config-react-app')],
                },
                ignore: false,
                useEslintrc: false,
                // @remove-on-eject-end
              },
              loader: require.resolve('eslint-loader'),
            },
          ],
          include: appSrc,
        },
        {
          test: /\.(ts|tsx)$/,
          enforce: 'pre',
          loader: require.resolve('tslint-loader'),
          include: appSrc,
        },
        // ** ADDING/UPDATING LOADERS **
        // The "file" loader handles all assets unless explicitly excluded.
        // The `exclude` list *must* be updated with every change to loader extensions.
        // When adding a new loader, you must add its `test`
        // as a new entry in the `exclude` list for "file" loader.

        // "file" loader makes sure those assets get served by WebpackDevServer.
        // When you `import` an asset, you get its (virtual) filename.
        // In production, they would get copied to the `build` folder.
        {
          exclude: [
            /\.html$/,
            /\.(js|jsx)$/,
            /\.(ts|tsx)$/,
            /\.css$/,
            /\.json$/,
            /\.bmp$/,
            /\.gif$/,
            /\.jpe?g$/,
            /\.png$/,
          ],
          loader: require.resolve('file-loader'),
          options: {
            name: 'media/[name].[hash:8].[ext]',
          },
        },
        // "url" loader works like "file" loader except that it embeds assets
        // smaller than specified limit in bytes as data URLs to avoid requests.
        // A missing `test` is equivalent to a match.
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
          loader: require.resolve('url-loader'),
          options: {
            limit: 10000,
            name: 'media/[name].[hash:8].[ext]',
          },
        },
        // Process JS with Babel.
        {
          test: /\.(js|jsx)$/,
          include: appSrc,
          loader: require.resolve('babel-loader'),
          options: {
            // @remove-on-eject-begin
            babelrc: false,
            presets: [require.resolve('babel-preset-react-app')],
            // @remove-on-eject-end
            // This is a feature of `babel-loader` for webpack (not Babel itself).
            // It enables caching results in ./node_modules/.cache/babel-loader/
            // directory for faster rebuilds.
            cacheDirectory: true,
          },
        },
        {
          test: /\.(ts|tsx)$/,
          include: appSrc,
          loader: require.resolve('awesome-typescript-loader'),
          options: {
            // transpileOnly: true,
            //silent: true,
            configFileName: appTsConfig,
          },
        },
        // "postcss" loader applies autoprefixer to our CSS.
        // "css" loader resolves paths in CSS and adds assets as dependencies.
        // "style" loader turns CSS into JS modules that inject <style> tags.
        // In production, we use a plugin to extract that CSS to a file, but
        // in development "style" loader enables hot editing of CSS.
        {
          test: /\.css$/,
          loader: ExtractTextPlugin.extract(
            Object.assign(
              {
                fallback: require.resolve('style-loader'),
                use: [
                  {
                    loader: require.resolve('css-loader'),
                    options: {
                      importLoaders: 1,
                    },
                  },
                  {
                    loader: require.resolve('postcss-loader'),
                    options: {
                      // Necessary for external CSS imports to work
                      // https://github.com/facebookincubator/create-react-app/issues/2677
                      ident: 'postcss',
                      plugins: () => [
                        require('postcss-flexbugs-fixes'),
                        autoprefixer({
                          browsers: [
                            '>1%',
                            'last 4 versions',
                            'Firefox ESR',
                            'not ie < 9', // React doesn't support IE8 anyway
                          ],
                          flexbox: 'no-2009',
                        }),
                      ],
                    },
                  },
                ],
              },
              extractTextPluginOptions
            )
          ),
        },
        // ** STOP ** Are you adding a new loader?
        // Remember to add the new extension(s) to the "url" loader exclusion list.
      ],
    },
    plugins: plugins.concat([
      new ForkTsCheckerWebpackPlugin({
        tsconfig: appTsConfig,
        silent: true,
      }),
      // Add module names to factory functions so they appear in browser profiler.
      new webpack.NamedModulesPlugin(),
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'development') { ... }. See `./env.js`.
      new webpack.DefinePlugin(clientEnv.stringified),
      // Note: this won't work without ExtractTextPlugin.extract(..) in `loaders`.
      new ExtractTextPlugin({
        filename: cssFilename,
      }),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebookincubator/create-react-app/issues/240
      new CaseSensitivePathsPlugin(),
      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for Webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      // See https://github.com/facebookincubator/create-react-app/issues/186
      new WatchMissingNodeModulesPlugin(appNodeModules),
      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how Webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    ]),
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
    },
    // Turn off performance hints during development because we don't do any
    // splitting or minification in interest of speed. These warnings become
    // cumbersome.
    performance: {
      hints: false,
    },
  };
};
