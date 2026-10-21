import React, { Component, PureComponent, createElement, createContext, forwardRef, ReactInstance, ContextType } from 'react';
import * as ReactDOM from 'react-dom';
import {
  adapter,
  pageRendererFactory,
  componentRendererFactory,
  blockRendererFactory,
  addonRendererFactory,
  tempRendererFactory,
  rendererFactory,
  types,
} from '@alilc/lowcode-renderer-core';
// 不要写成 `import ConfigProvider from '@alifd/next/lib/config-provider'`：
// 那是 CJS 子路径（exports.default + __esModule），rolldown（Vite 8）对这类 CJS 的
// default-import 互操作不会解包 .default，拿到的是**命名空间对象**，
// 于是 adapter.setConfigProvider(对象) → renderer 里 createElement(ConfigProvider) 抛
// React #130「got: object」（Edge 实测，dev 构建才给出组件名 Renderer）。
// 改用具名 ESM 导出（@alifd/next 的 es/index.js 有 `export { default as ConfigProvider }`）。
import { ConfigProvider } from '@alifd/next';
import { findDOMNode } from '@alilc/lowcode-utils';

window.React = React;
(window as any).ReactDom = ReactDOM;

adapter.setRuntime({
  // IRuntime.Component/PureComponent 是「同时兼容 react 与 rax」的鸭子类型构造器
  // （泛型构造签名），React 的具体 Component 类结构上并不完全吻合，
  // 这里在 adapter 注入点做一次显式收窄（与 renderer-core/hoc/leaf.tsx 里的做法一致）。
  Component: Component as unknown as types.IGeneralConstructor,
  PureComponent: PureComponent as unknown as types.IGeneralConstructor,
  createContext,
  createElement,
  forwardRef,
  // React 19 移除了 ReactDOM.findDOMNode，改用本地 fiber 实现，保持 renderer-core 的运行时契约不变
  findDOMNode,
});

adapter.setRenderers({
  PageRenderer: pageRendererFactory(),
  ComponentRenderer: componentRendererFactory(),
  BlockRenderer: blockRendererFactory(),
  AddonRenderer: addonRendererFactory(),
  TempRenderer: tempRendererFactory(),
  DivRenderer: blockRendererFactory(),
});

adapter.setConfigProvider(ConfigProvider);

function factory(): types.IRenderComponent {
  const Renderer = rendererFactory();
  return class ReactRenderer extends Renderer implements Component {
    readonly props: types.IRendererProps;

    context: ContextType<any>;

    setState: (
      state: types.IRendererState,
      callback?: () => void,
    ) => void;

    forceUpdate: (callback?: () => void) => void;

    refs: {
      [key: string]: ReactInstance;
    };

    constructor(props: types.IRendererProps, context: ContextType<any>) {
      super(props, context);
    }

    isValidComponent(obj: any) {
      return obj?.prototype?.isReactComponent || obj?.prototype instanceof Component;
    }
  };
}

export default factory();
