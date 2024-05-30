import { resolve } from 'node:path';

const isRelease = Bun.env.BUN_ENV === 'production';

const PROJECT_ROOT = import.meta.dir;
const SRC_DIR = resolve(PROJECT_ROOT, 'src');
const DIST_DIR = resolve(PROJECT_ROOT, 'dist');

export default {
  entrypoints: [resolve(SRC_DIR, 'index.js')],
  root: SRC_DIR,
  outdir: DIST_DIR,
  minify: isRelease,
  naming: {
    asset: 'assets/[name]-[hash].[ext]',
  },
  external: ['preact', 'preact/hooks', `preact/jsx-${isRelease ? '' : 'dev-'}runtime`, '@blockcode/core'],
};
