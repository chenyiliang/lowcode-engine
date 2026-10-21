import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * code-generator 是 Node/CLI 库（不是浏览器库）：
 * - 源码里大量使用 require()、__dirname、node 内置模块（fs/path/child_process/buffer）
 * - 消费方（build-plugin-lowcode、CLI）以 CommonJS 方式 require 它
 * - 主入口 index，外加 standalone / cli 等子路径入口
 *
 * 因此这里与浏览器包不同：产出 CJS 入口，包保持 CommonJS（不设 "type": "module"），
 * 运行时的 require()/__dirname 才能正常工作。所有裸导入一律 external。
 *
 * 例外：`standalone-loader` 是**浏览器**入口（内部用 Worker/self/Blob），消费方
 * code-generator-demo 以 ESM 方式 import 它，所以它额外产出一份 ESM（见下方 formats）。
 * 它零运行时依赖，external 与否对它没有影响。
 *
 * `standalone-worker` 不在这里构建 —— 它由 loader 通过 blob URL 塞进 Web Worker，
 * 必须是**自包含 IIFE**（blob 里的脚本没有模块解析能力，也不能用 ESM），
 * 打包策略与本配置完全相反（要全量 bundle + 桩掉 Node 内建模块），
 * 所以单独放在 vite.config.worker.ts 里。
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
  define: {
    // 取代旧构建注入的版本号占位符（standalone-loader 用它拼 CDN 地址）
    __PACKAGE_VERSION__: JSON.stringify('1.1.7'),
  },
  build: {
    // Node 目标：保留 require/__dirname/process 等运行时能力
    target: 'node18',
    ssr: true,
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        standalone: path.resolve(__dirname, 'src/standalone.ts'),
        'standalone-loader': path.resolve(__dirname, 'src/standalone-loader.ts'),
        cli: path.resolve(__dirname, 'src/cli/index.ts'),
      },
      // cjs 给 Node 消费方；es 只为 standalone-loader 服务（浏览器 import）。
      // 其它入口会顺带产出 .mjs，无害（exports 里只引用 .js）。
      formats: ['cjs', 'es'],
      fileName: (format, entryName) =>
        format === 'es' ? `${entryName}.mjs` : `${entryName}.js`,
    },
    rollupOptions: {
      external: isBare,
      output: {
        // 主入口同时有 default + 具名导出，用 named 导出形式避免 MIXED_EXPORTS 警告
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});
