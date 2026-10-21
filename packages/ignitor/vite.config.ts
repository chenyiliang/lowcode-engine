import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

/**
 * ignitor 是一个「调试产物」包：把 engine 与 react-simulator-renderer 合并成一份 IIFE，
 * 输出到 dist，供本地代理调试（iframe 里通过 <script src> 加载经典脚本）使用。
 * 对应旧 build.json 的两个 entry（AliLowCodeEngine / ReactSimulatorRenderer）——
 * Vite 的 iife 格式不支持多 entry，故合并为单入口，两个全局都挂上。
 *
 * iframe 运行时里 react / react-dom / next 等由宿主页面提前挂到 window，
 * 所以这些裸包（含子路径）一律 external，并映射到对应全局变量；
 * 其余 @alilc/* 引擎包全部打进这一份 IIFE。
 */
const IFRAME_GLOBALS: Record<string, string> = {
  react: 'React',
  'react-dom': 'ReactDOM',
  'prop-types': 'PropTypes',
  '@alifd/next': 'Next',
  moment: 'moment',
  lodash: '_',
};

function iframeGlobal(id: string): string | undefined {
  for (const [name, globalName] of Object.entries(IFRAME_GLOBALS)) {
    if (id === name || id.startsWith(`${name}/`)) return globalName;
  }
  return undefined;
}

export default defineConfig({
  plugins: [
    react(),
    dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true }),
  ],
  define: {
    VERSION_PLACEHOLDER: JSON.stringify('1.3.2'),
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AliLowCodeEngine',
      formats: ['iife'],
      fileName: () => 'index.js',
      cssFileName: 'index',
    },
    rollupOptions: {
      external: (id: string) => iframeGlobal(id) !== undefined,
      output: {
        globals: ((id: string) => iframeGlobal(id)) as unknown as Record<string, string>,
      },
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});
