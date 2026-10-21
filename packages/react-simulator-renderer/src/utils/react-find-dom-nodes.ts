import { ReactInstance } from 'react';
import { isElement } from '@alilc/lowcode-utils';
import { isDOMNode } from './is-dom-node';

export const getReactInternalFiber = (el: any) => {
  return el._reactInternals || el._reactInternalFiber;
};

function elementsFromFiber(fiber: any, elements: Array<Element | Text>) {
  if (fiber) {
    if (fiber.stateNode && isDOMNode(fiber.stateNode)) {
      elements.push(fiber.stateNode);
    } else if (fiber.child) {
      // deep fiberNode.child
      elementsFromFiber(fiber.child, elements);
    }

    if (fiber.sibling) {
      elementsFromFiber(fiber.sibling, elements);
    }
  }
}

/**
 * React 19 移除了 ReactDOM.findDOMNode，这里改为完全依赖 fiber 树遍历来取 DOM 节点。
 * 原本 fiber 遍历就是主路径，findDOMNode 只是兜底；去掉兜底后，
 * 遍历不到 DOM 节点时返回 null，由调用方（host.getRects / findDOMNodes）处理。
 */
export function reactFindDOMNodes(elem: ReactInstance | null): Array<Element | Text> | null {
  if (!elem) {
    return null;
  }
  if (isElement(elem)) {
    return [elem];
  }
  const elements: Array<Element | Text> = [];
  const fiberNode = getReactInternalFiber(elem);
  // 组件实例本身可能直接挂着 DOM（stateNode），先从当前 fiber 找，再深入子树
  if (fiberNode) {
    if (fiberNode.stateNode && isDOMNode(fiberNode.stateNode)) {
      elements.push(fiberNode.stateNode);
    } else {
      elementsFromFiber(fiberNode.child, elements);
    }
  }
  return elements.length > 0 ? elements : null;
}
