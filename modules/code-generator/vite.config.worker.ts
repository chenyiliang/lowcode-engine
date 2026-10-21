import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * standalone-worker 的独立构建 —— 与主库（vite.config.ts）策略相反。
 *
 * 为什么要单独一个配置：
 * - loader 会 fetch 这个文件的**文本内容**，然后 `new Worker(URL.createObjectURL(blob), {type:'classic'})`
 *   把它塞进 Web Worker 运行。
 * - blob URL 里的脚本运行在一个**没有模块解析能力**的环境：既不能 `require()` 外部包，
 *   也不能用 ESM `import`（classic worker 不支持 module）。
 * - 所以它必须是**自包含 IIFE**：全量 bundle（external: []），一个文件里含所有代码。
 *
 * 对照 HEAD 的 scripts/build-standalone-worker.js：
 *   bundle: true, format: 'iife', target: ['chrome69']，
 *   并用 esbuild-plugin-ignore 把 fs / react / setter-config 桩掉
 *   （注释原文：「@alilc/lowcode-types 中误依赖了 react，这里忽略下」）。
 * 这里用 resolve.alias 指向空模块达到同样效果。
 *
 * 产出文件名固定为 `dist/standalone-worker.js`（不随 format 变），因为 loader 的
 * DEFAULT_WORKER_JS 指向 `dist/standalone-worker.min.js`，两者名字必须对得上。
 */

const EMPTY_STUB = path.resolve(__dirname, 'build/empty-stub.js');

// Worker 环境里不存在的东西，一律指向空模块
const WORKER_STUBS: Record<string, string> = {
  fs: EMPTY_STUB,
  'fs/promises': EMPTY_STUB,
  'node:fs': EMPTY_STUB,
  'node:fs/promises': EMPTY_STUB,
  // @alilc/lowcode-types 误依赖 react（HEAD 明确 ignore 掉了），Worker 用不到
};

export default defineConfig({
  define: {
    // Worker 里没有 process，依赖链里有两类访问都要处理：
    // 1) 裸 `process &&` 平台检测（nanomatch 的 `process.platform === 'win32'`）——
    //    裸标识符未声明会抛 ReferenceError，必须整体替换 process 标识符。
    // 2) `process.env.NODE_ENV`（react 生产代码入口）—— Vite 对这个子表达式有保留处理，
    //    裸 process 的 define **覆盖不到它**，必须单独再 define 一次。
    // 实测：只 define 裸 process 时，react 的 `process.env.NODE_ENV === "production"` 残留，
    // node:vm 沙箱仍报 `process is not defined`；两个 key 都给才干净。
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.STANDALONE': JSON.stringify('true'),
    'process.env': JSON.stringify({ NODE_ENV: 'production', STANDALONE: 'true' }),
    process: JSON.stringify({
      env: { NODE_ENV: 'production', STANDALONE: 'true' },
      platform: 'browser',
      versions: {},
      browser: true,
    }),
  },
  resolve: {
    // 只桩掉 Worker 里确实不存在、且依赖链会静态引用的 Node 内建模块。
    // 注意：曾经这里注释说「path 用 path-browserify polyfill」，但那是过时描述 ——
    // 实测 worker 产物（node:vm 沙箱，未提供 path）执行通过，说明依赖链并未静态引用 path，
    // 因此不需要 path 别名，path-browserify 也已从 dependencies 移除。
    alias: WORKER_STUBS,
  },
  build: {
    target: 'chrome69',
    outDir: 'dist',
    // 不清空 dist：主库构建的产物也在 dist 里，两者是叠加关系
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/standalone-worker.ts'),
      formats: ['iife'],
      name: 'AliLowCodeCodeGeneratorWorker',
      fileName: () => 'standalone-worker.js',
    },
    rollupOptions: {
      // 关键：不 external 任何东西，全部打进这一个文件
      external: [],
    },
    // 保持不压缩（与 HEAD 一致：minify:false）。loader 另外需要 .min.js，
    // 由 build:worker:min 脚本用 esbuild/terser 单独压缩产出，见 package.json scripts。
    minify: false,
    sourcemap: true,
  },
});
