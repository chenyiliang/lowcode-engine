import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

/**
 * material-parser 是 Node 库（不是浏览器库）：
 * - 源码里大量使用 require()（含 react-docgen 的深层 CJS 内部路径）、__dirname、node 内置模块
 * - 消费方（build-plugin-lowcode 等）以 CommonJS 方式 require 它
 *
 * 因此只产出 CJS（index.cjs），包保持 CommonJS（不设 "type": "module"），
 * 这样运行时的 require()/__dirname 才能正常工作。所有裸导入一律 external。
 */
function isBare(id: string) {
  if (id.startsWith('.') || id.startsWith('virtual:') || id.startsWith('\0')) return false;
  if (id.startsWith('/')) return false;
  if (/^[a-zA-Z]:[\\/]/.test(id)) return false;
  if (id.startsWith('\\\\')) return false;
  return !path.isAbsolute(id);
}

export default defineConfig({
  plugins: [
    dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true }),
  ],
  build: {
    // Node 目标：保留 require/__dirname/process 等运行时能力
    target: 'node18',
    ssr: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    rollupOptions: {
      external: isBare,
      output: {
        // react-docgen 的深层内部路径（dist/utils/...）也要保持 external，运行时 require
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});
