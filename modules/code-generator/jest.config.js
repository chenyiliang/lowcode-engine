/**
 * jest 配置。
 *
 * 为什么不用 HEAD 原来的 `preset: 'ts-jest'`：
 * ts-jest 需要 TypeScript 的 **JavaScript Compiler API**，而 TS 7（本项目用的 7.0.2，原生 Go 重写版）
 * 不再提供该 API。实测报错：
 *   The TypeScript compiler "typescript" (version 7.0.2) does not expose the JavaScript
 *   compiler API required by ts-jest.
 * ts-jest 的 peerDependencies 也写明只支持 `typescript: >=4.3 <7`。
 * （vite-plugin-dts 遇到过同一个根因，那边是靠官方伴生包 @typescript/typescript6 解决的；
 *   但 ts-jest 没有对应的伴生方案，且把 typescript 别名成 v6 会让整个 workspace 退回 TS6，
 *   与「升到最新」的目标冲突，所以这里改用 swc 转换。）
 *
 * @swc/jest 用 swc 做转译，不依赖 TS 的 JS API，因此与 TS7 共存没有问题。
 * 代价：swc 只做转译、**不做类型检查**（ts-jest 会顺带检查）。类型检查已由
 * `pnpm run typecheck`（tsc --noEmit）独立覆盖，职责分离反而更清晰。
 *
 * 迁移期间 ts-jest 被从 devDependencies 删掉了，但本文件的 preset 还留着，
 * 导致 37 个测试文件全部报 "Preset ts-jest not found" 跑不起来 —— 这里一并修复。
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true, decorators: true },
          target: 'es2022',
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!core-js)/'],
  // tests/fixtures 下有大量期望产物的 package.json，它们同名（icejs3-demo-app / rax-demo-app），
  // 会被 jest-haste-map 当成模块名冲突而刷警告。这些是数据夹具、不是被测模块，直接忽略其扫描。
  modulePathIgnorePatterns: ['<rootDir>/tests/fixtures/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!**/node_modules/**', '!**/vendor/**'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFiles: ['./jest.setup.js'],
};
