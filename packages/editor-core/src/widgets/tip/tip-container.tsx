import { Component } from 'react';
import { createPortal } from 'react-dom';
import { TipItem } from './tip-item';
import { tipHandler } from './tip-handler';

export class TipContainer extends Component {
  private dispose?: () => void;
  shouldComponentUpdate() {
    return false;
  }
  componentDidMount() {
    const over = (e: MouseEvent) => tipHandler.setTarget(e.target as any);
    const down = () => tipHandler.hideImmediately();
    document.addEventListener('mouseover', over, false);
    document.addEventListener('mousedown', down, true);
    this.dispose = () => {
      document.removeEventListener('mouseover', over, false);
      document.removeEventListener('mousedown', down, true);
    };
  }

  // React 19 移除了 UNSAFE_componentWillMount。
  // 原本这里想在挂载前清理监听，但 dispose 只在 componentDidMount 里赋值，
  // 挂载前恒为 undefined，是个空操作；真正的清理应发生在卸载时，故改为 componentWillUnmount。
  componentWillUnmount() {
    if (this.dispose) {
      this.dispose();
      this.dispose = undefined;
    }
  }

  render() {
    return createPortal(
      <div className="lc-tips-container">
        <TipItem />
      </div>,
      document.querySelector('body')!,
    );
  }
}
