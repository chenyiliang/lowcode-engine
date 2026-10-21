/**
 * setter 的鸭子类型：可能是「组件（带静态 Hotter / transducer）」或其 `type`。
 * 只描述下面辅助函数真正访问到的属性，避免用 any 掩盖问题。
 * （与 packages/designer/src/designer/setting/utils.ts 中的同名实现保持一致。）
 */
interface SetterLike {
  Hotter?: Array<(value: any) => any>;
  transducer?: TransducerPair;
  Transducer?: TransducerPair;
  type?: SetterLike;
}

/** Hotter / transducer 归一化后的形状：hot 数据 <-> 原生数据 的双向转换 */
interface TransducerPair {
  toHot?: (data: any) => any;
  toNative?: (data: any) => any;
}

/** combineTransducer 的返回：两个方向都已绑定好 context 的函数 */
interface BoundTransducer {
  toHot: (data: any) => any;
  toNative: (data: any) => any;
}

function getHotterFromSetter(setter: SetterLike | null | undefined): Array<(value: any) => any> {
  return (setter && (setter.Hotter || (setter.type && setter.type.Hotter))) || []; // eslint-disable-line
}

function getTransducerFromSetter(setter: SetterLike | null | undefined): TransducerPair | null {
  return (setter && (
    setter.transducer || setter.Transducer
      || (setter.type && (setter.type.transducer || setter.type.Transducer))
    )) || null; // eslint-disable-line
}

function combineTransducer(
  transducer: TransducerPair | null,
  arr: Array<(value: any) => any>,
  context: unknown,
): BoundTransducer {
  if (!transducer && Array.isArray(arr)) {
    const [toHot, toNative] = arr;
    transducer = { toHot, toNative };
  }

  return {
    toHot: ((transducer && transducer.toHot) || ((x: any) => x)).bind(context), // eslint-disable-line
    toNative: ((transducer && transducer.toNative) || ((x: any) => x)).bind(context), // eslint-disable-line
  };
}

export class Transducer {
  setterTransducer: BoundTransducer;

  context: unknown;

  constructor(context: unknown, config: { setter: SetterLike | null | undefined }) {
    this.setterTransducer = combineTransducer(
      getTransducerFromSetter(config.setter),
      getHotterFromSetter(config.setter),
      context,
    );
    this.context = context;
  }

  toHot(data: any) {
    return this.setterTransducer.toHot(data);
  }

  toNative(data: any) {
    return this.setterTransducer.toNative(data);
  }
}
