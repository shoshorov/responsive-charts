const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// ---------------------------------------------------------------------------
// Plugin: after the UI bundle is emitted, manually splice the JS inline into
// the HTML. Replaces html-inline-script-webpack-plugin which silently fails
// in webpack 5 production mode (emits ui.js but never injects it into the HTML).
// ---------------------------------------------------------------------------
class SpliceJsIntoHtml {
  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('SpliceJsIntoHtml', (compilation, callback) => {
      const distDir = path.resolve(__dirname, 'dist');
      const htmlPath = path.join(distDir, 'ui.html');
      const jsPath   = path.join(distDir, 'ui.js');

      if (!fs.existsSync(htmlPath) || !fs.existsSync(jsPath)) {
        callback();
        return;
      }

      let html = fs.readFileSync(htmlPath, 'utf8');
      const js = fs.readFileSync(jsPath, 'utf8');

      // HtmlWebpackPlugin injects  <script defer src="ui.js"></script>
      // Replace that tag (any variant) with an inline block.
      const scriptTagRe = /<script[^>]+src="[^"]*ui\.js"[^>]*><\/script>/i;
      if (scriptTagRe.test(html)) {
        html = html.replace(scriptTagRe, `<script>${js}</script>`);
      } else {
        // Fallback: append before </body>
        html = html.replace('</body>', `<script>${js}</script></body>`);
      }

      fs.writeFileSync(htmlPath, html);
      console.log('[SpliceJsIntoHtml] inlined ui.js into ui.html (' + js.length + ' bytes)');
      callback();
    });
  }
}

// ---------------------------------------------------------------------------
// Plugin: read dist/ui.html just before the code compiler starts (guaranteed
// to run after the UI compiler's afterEmit hook has already finished).
// ---------------------------------------------------------------------------
class InlineHtmlPlugin {
  apply(compiler) {
    compiler.hooks.beforeCompile.tapAsync('InlineHtmlPlugin', (params, callback) => {
      const htmlPath = path.resolve(__dirname, 'dist/ui.html');
      const html = fs.existsSync(htmlPath)
        ? fs.readFileSync(htmlPath, 'utf8')
        : '';
      new webpack.DefinePlugin({ __html__: JSON.stringify(html) }).apply(compiler);
      callback();
    });
  }
}

// ---------------------------------------------------------------------------
// UI config: bundle ui.ts → ui.js, generate ui.html from template, then splice
// ---------------------------------------------------------------------------
const uiConfig = {
  name: 'ui',
  entry: './src/ui.ts',
  module: {
    rules: [{ test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }],
  },
  resolve: { extensions: ['.ts', '.js'] },
  output: {
    filename: 'ui.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/ui.html',
      filename: 'ui.html',
      chunks: ['ui'],
      inject: 'body',          // puts <script src="ui.js"> before </body>
      scriptLoading: 'blocking', // no defer — makes the src tag easier to match
    }),
    new SpliceJsIntoHtml(),    // replaces <script src="ui.js"> with inline JS
  ],
};

// ---------------------------------------------------------------------------
// Code config: bundle code.ts, replace __html__ with the now-complete ui.html
// ---------------------------------------------------------------------------
const codeConfig = {
  name: 'code',
  dependencies: ['ui'],          // ensures UI builds first
  entry: './src/code.ts',
  module: {
    rules: [{ test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }],
  },
  resolve: { extensions: ['.ts', '.js'] },
  output: {
    filename: 'code.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [new InlineHtmlPlugin()],
};

module.exports = [uiConfig, codeConfig];
