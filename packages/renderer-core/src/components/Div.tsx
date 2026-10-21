import adapter from '../adapter';
import { IGeneralConstructor } from '../types';

export default function divFactory(): IGeneralConstructor {
  const { PureComponent, createElement } = adapter.getRuntime();
  // IGeneralConstructor 是「兼容 react / rax」的鸭子类型构造器（泛型构造签名）。
  // 这里的具体组件类结构上无法直接赋给泛型构造签名，故在返回处显式收窄
  // （与本包 hoc/leaf.tsx 里对 runtime.Component 的处理一致）。
  return class Div extends PureComponent {
    static displayName = 'Div';

    static version = '0.0.0';

    render() {
      return createElement('div', this.props);
    }
  } as unknown as IGeneralConstructor;
}
