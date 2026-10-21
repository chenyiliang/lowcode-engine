import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';

/**
 * 库模式 external 判定：只把「裸模块说明符」（依赖 / peer / workspace 包）external，
 * 相对路径与项目内绝对路径都要打进产物。
 * 不能用 id.startsWith('.') 判断相对路径 —— Windows 下 rolldown 会以已解析的绝对路径
 * （形如 D:/.../src/x.ts）二次调用该回调，会被误判为 external 而产生坏引用。
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
    react(),
    dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'index.mjs' : 'index.cjs'),
      // 固定样式产物名为 dist/index.css（默认会取 package.json 的 name，不利于消费方引用）
      cssFileName: 'index',
    },
    rollupOptions: {
      external: isBare,
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});
