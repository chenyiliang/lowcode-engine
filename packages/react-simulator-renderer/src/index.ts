import { runInAction } from 'mobx';
import renderer from './renderer';

if (typeof window !== 'undefined') {
  (window as any).SimulatorRenderer = renderer;
}

window.addEventListener('beforeunload', () => {
  runInAction(() => {
    (window as any).LCSimulatorHost = null;
    // React 19：renderer.dispose() 内部已用 root.unmount() 卸载 ReactDOM.render 的替代逻辑，
    // 旧的 ReactDOM.unmountComponentAtNode 在 React 19 已移除，这里不再调用。
    renderer.dispose?.();
    (window as any).SimulatorRenderer = null;
  });
});

export default renderer;
