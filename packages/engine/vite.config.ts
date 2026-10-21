import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import pkg from './package.json';

const nodeRequire = createRequire(import.meta.url);

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

/**
 * 聚合各子包的 CSS 成 engine 自己的 dist/index.css。
 *
 * 为什么必须这么做：engine 是聚合包，src 里**没有任何样式 import**（实测 grep 为 0），
 * lib 模式下又把各子包 external 掉了，于是每个子包各自产出 dist/index.css，
 * 但没有任何入口把它们汇总 —— engine 自己的 dist 里就没有 CSS。
 * 而 package.json 的 exports 却声明了 "./style.css": "./dist/index.css"，
 * 8 个 demo 的 src/styles.ts 全都 `import '@alilc/lowcode-engine/style.css'`，
 * 文件不存在 → demo 的 app build 直接 `Rolldown failed to resolve`。
 *
 * 也不能靠「在 src/index.ts 里 import 子包 CSS」来解决：
 * isBare() 会把 '@alilc/lowcode-designer/dist/index.css' 判为 external（不以 . 或 / 开头），
 * CSS 不会被打进产物，只会留一条 external 引用。实测确认过这条走不通。
 *
 * 排除项（重要）：
 * - react-simulator-renderer：它跑在**画布 iframe** 里，由 designer 的 BuiltinSimulatorHost
 *   通过 simulatorUrl 单独注入（builtin-simulator/host.ts 里 `${prefix}/react-simulator-renderer.css`）。
 *   混进宿主页面 CSS 会造成样式互相污染。
 * - ignitor：独立 dev 入口（124KB），不在 engine 的 dependencies 里。
 * - engine-ext：它的 CSS 由消费方单独 `import '@alilc/lowcode-engine-ext/style.css'`，
 *   且它是跨仓库包、有自己的 fusion.css 主题产物，不该被 engine 吸收。
 *
 * 顺序按依赖深度（底层在前、上层在后），保证 CSS 级联覆盖关系正确。
 */
const CSS_SUBPACKAGES = [
  '@alilc/lowcode-utils',
  '@alilc/lowcode-editor-core',
  '@alilc/lowcode-designer',
  '@alilc/lowcode-editor-skeleton',
  '@alilc/lowcode-workspace',
  '@alilc/lowcode-plugin-outline-pane',
  '@alilc/lowcode-plugin-designer',
];

function aggregateSubpackageCss(): Plugin {
  return {
    name: 'engine:aggregate-css',
    apply: 'build',
    closeBundle() {
      const chunks: string[] = [];
      for (const name of CSS_SUBPACKAGES) {
        let cssPath: string;
        try {
          // 走 exports 声明的 ./style.css（子包 exports 并未暴露 dist/index.css 原始路径）
          cssPath = nodeRequire.resolve(`${name}/style.css`);
        } catch {
          this.warn(`${name}/style.css 解析失败，已跳过（子包可能尚未构建）`);
          continue;
        }
        if (!fs.existsSync(cssPath)) {
          this.warn(`${cssPath} 不存在，已跳过`);
          continue;
        }
        chunks.push(`/* ${name} */\n${fs.readFileSync(cssPath, 'utf-8')}`);
      }
      if (!chunks.length) {
        this.warn('没有任何子包 CSS 可聚合，dist/index.css 未生成');
        return;
      }
      const outDir = path.resolve(__dirname, 'dist');
      fs.mkdirSync(outDir, { recursive: true });
      const out = path.join(outDir, 'index.css');
      fs.writeFileSync(out, chunks.join('\n'));
      this.info?.(`聚合 ${chunks.length} 个子包 CSS → dist/index.css`);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true }),
    aggregateSubpackageCss(),
  ],
  define: {
    // 取代旧的 webpack DefinePlugin：构建期注入版本号（原从 git 分支 / lerna.json 推导）
    VERSION_PLACEHOLDER: JSON.stringify(pkg.version),
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'index.mjs' : 'index.cjs'),
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
