const esbuild = require('esbuild');
const plugin = require('node-stdlib-browser/helpers/esbuild/plugin');
const { replace } = require('esbuild-plugin-replace');
const stdLibBrowser = require('node-stdlib-browser');

console.log('START building ESM bundle...');
esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  outfile: 'dist/bundle.js',
  sourcemap: false,
  // sourcemap: 'inline',
  format: 'cjs',
  legalComments: 'none',
  treeShaking: true,
  plugins: [
    plugin(stdLibBrowser),

    replace({
      'eval(': 'REPLACEDeval(',
      'import(': 'REPLACEDimport(',
      codeToReplace: '',
    }),
  ],
  define: {
    Buffer: 'Buffer',
    global: 'global',
    process: 'process',
  },
  inject: [require.resolve('node-stdlib-browser/helpers/esbuild/shim')],
  loader: {
    '.worker.js': 'text',
  },
});
console.log('FINISH building ESM bundle');
