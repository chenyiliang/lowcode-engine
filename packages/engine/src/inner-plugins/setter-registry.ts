import { IPublicModelPluginContext } from '@alilc/lowcode-types';

// 注册默认的 setters
//
// ⚠️ 这里必须用 init() 内的**动态 import**，不能改成顶层静态 import。
//
// engine 与 engine-ext 是双向依赖（engine-ext 的 setter 大量 `import { common } from '@alilc/lowcode-engine'`），
// 顶层静态 import 会在模块求值期打开循环，导致运行时崩溃。完整求值链（已逐行核实）：
//   1. engine-core.ts:64   顶层 import setterRegistry（本文件）
//   2. → 本文件顶层 import '@alilc/lowcode-engine-ext'
//   3. → engine-ext src/index.tsx:23 import './setter/array-setter'
//   4. → array-setter/index.tsx:3  import { common } from '@alilc/lowcode-engine'
//      且第 9 行**模块顶层**就 `const { editorCabin, skeletonCabin } = common;`
//   5. 回到 engine-core.ts:136 才执行 `const common = new Common(...)`
// 第 4 步执行时 common 还是 undefined，解构 undefined → TypeError。
// engine-ext 里有 10+ 个文件这样在顶层解构 common（array-setter / mixed-setter / object-setter /
// style-setter / 各 locale/index.ts），不可能逐个改；只能在 engine 侧保持懒加载。
//
// HEAD 原始代码正是懒加载（函数内 `require('@alilc/lowcode-engine-ext')?.setters`），
// 因为本包已是 ESM 不能用 require，这里改用动态 import 保持同样语义。
// init() 会被 await（designer/src/plugin/plugin-manager.ts:129、171），所以异步是安全的。
export const setterRegistry = (ctx: IPublicModelPluginContext) => {
  return {
    async init() {
      const { config } = ctx;
      if (config.get('disableDefaultSetters')) return;
      const { default: AliLowCodeEngineExt } = await import('@alilc/lowcode-engine-ext');
      const builtinSetters = AliLowCodeEngineExt?.setters;
      if (builtinSetters) {
        ctx.setters.registerSetter(builtinSetters);
      }
    },
  };
};

setterRegistry.pluginName = '___setter_registry___';
