import type { ReactNode } from 'react';
import adapter from '../../adapter';
import { IGeneralConstructor } from '../../types';
import './index.css';

/** VisualDom 的 props：React 19 不再支持 propTypes，改用 TS 类型描述 */
export interface IVisualDomProps {
  children?: ReactNode | ReactNode[] | null;
  /** 自定义内容渲染函数，优先于 children */
  cell?: () => ReactNode;
  title?: ReactNode;
  label?: ReactNode;
  text?: ReactNode;
  __componentName?: string;
  [key: string]: any;
}

export default function visualDomFactory(): IGeneralConstructor {
  const { PureComponent, createElement } = adapter.getRuntime();
  // 同 Div.tsx：IGeneralConstructor 是「兼容 react / rax」的鸭子类型构造器（泛型构造签名），
  // 具体组件类结构上无法直接赋值，故在返回处显式收窄。
  return class VisualDom extends PureComponent<IVisualDomProps> {
    static displayName = 'VisualDom';

    static defaultProps = {
      children: null,
    };

    render() {
      const { children, cell, title, label, text, __componentName } = this.props;
      let mainContent = children;
      if (cell && typeof cell === 'function') {
        mainContent = cell();
      }
      return createElement('div', { className: 'visual-dom' },
        createElement('div', { className: 'panel-container' },
          [
            createElement('span', { className: 'title' }, title || label || text || __componentName),
            createElement('div', { className: 'content' }, mainContent),
          ]));
    }
  } as unknown as IGeneralConstructor;
}
