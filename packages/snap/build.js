const esbuild = require('esbuild');
const plugin = require('node-stdlib-browser/helpers/esbuild/plugin');
const { replace } = require('esbuild-plugin-replace');
let stdLibBrowser = require('node-stdlib-browser');
const path = require('path');

stdLibBrowser = {
  ...stdLibBrowser,
  "@0xpolygonid/js-sdk": path.join(__dirname, '../../node_modules/@0xpolygonid/js-sdk/dist/esm/index.js')
};

console.log('START building ESM bundle...');
esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  outfile: 'dist/bundle.js',
  sourcemap: false,
  format: 'cjs',
  legalComments: 'none',
  treeShaking: true,
  plugins: [
    plugin(stdLibBrowser),
  ],
  define: {
    Buffer: 'Buffer',
    global: 'global',
    process: 'process',
  },
  inject: [require.resolve('node-stdlib-browser/helpers/esbuild/shim')],
});
console.log('FINISH building ESM bundle');
