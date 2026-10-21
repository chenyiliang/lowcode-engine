import { ReactInstance } from 'react';

/**
 * React 19 已彻底移除 `ReactDOM.findDOMNode`，这里用 fiber 树遍历实现等价能力。
 *
 * 原 `findDOMNode(instance)` 的语义：返回该组件渲染出的第一个宿主 DOM 节点（Element | Text）。
 * 在 React 的 fiber 结构里，宿主节点（div / span / 文本等）的 `stateNode` 即真实 DOM，
 * 因此从组件实例的 fiber 出发，先向下（child）再向后（sibling）遍历，
 * 取到的第一个 DOM 节点即为等价结果。
 *
 * 注意：这是设计态用的兜底方案。新增代码仍应优先通过 ref 直接持有 DOM 节点。
 */

function isDOMNode(node: any): node is Element | Text {
  return (
    !!node &&
    (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE)
  );
}

/** React 16/17 用 `_reactInternalFiber`，React 18+ 用 `_reactInternals` */
export function getReactInternalFiber(instance: any): any {
  return instance?._reactInternals || instance?._reactInternalFiber;
}

function findDOMNodeFromFiber(fiber: any): Element | Text | null {
  let node = fiber;
  while (node) {
    if (node.stateNode && isDOMNode(node.stateNode)) {
      return node.stateNode;
    }
    if (node.child) {
      const found = findDOMNodeFromFiber(node.child);
      if (found) {
        return found;
      }
    }
    node = node.sibling;
  }
  return null;
}

/**
 * 取组件实例对应的宿主 DOM 节点。
 * @param instance React 组件实例；若传入的已经是 DOM 节点则原样返回
 * @returns 宿主 DOM 节点，找不到时返回 null（例如组件渲染为 null）
 */
export function findDOMNode(instance: ReactInstance | Element | Text | null | undefined): Element | Text | null {
  if (!instance) {
    return null;
  }
  if (isDOMNode(instance)) {
    return instance;
  }
  return findDOMNodeFromFiber(getReactInternalFiber(instance));
}
