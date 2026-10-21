/**
 * prop-types 的这两个内部子路径没有官方类型声明，但它们是被 React 生态广泛使用的稳定入口。
 * check-prop-types.ts 需要用工厂函数自行构造一个「严格模式」的 PropTypes 实例来做 schema 校验。
 */
declare module 'prop-types/lib/ReactPropTypesSecret' {
  const ReactPropTypesSecret: string;
  export default ReactPropTypesSecret;
}

declare module 'prop-types/factoryWithTypeCheckers' {
  import type { Validator } from 'prop-types';

  type CheckPropTypes = (
    propTypes: Record<string, unknown>,
    values: Record<string, unknown>,
    location: string,
    componentName: string | null,
    getStack: (() => string | null) | null,
  ) => void;

  export default function factoryWithTypeCheckers(
    isValidElement: (obj: unknown) => boolean,
    useSecrets: boolean,
  ): Record<string, Validator<any>> & { checkPropTypes: CheckPropTypes };
}
