// all this file for polyfill vision logic
import { isValidElement } from 'react';
import { IPublicTypeFieldConfig, IPublicTypeSetterConfig } from '@alilc/lowcode-types';
import { isSetterConfig, isDynamicSetter } from '@alilc/lowcode-utils';
import { ISettingField } from './setting-field';

/**
 * setter 的鸭子类型：它可能是「组件（带静态 Hotter / transducer）」、「setter 配置对象」，
 * 也可能是前两者的 `type`（React 组件类 / 函数）。
 * 这里只描述下面几个辅助函数真正会访问到的属性，避免用 any 掩盖问题。
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
  return (
    (setter &&
      (setter.transducer ||
        setter.Transducer ||
        (setter.type && (setter.type.transducer || setter.type.Transducer)))) ||
    null
  ); // eslint-disable-line
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

  context: ISettingField;

  constructor(context: ISettingField, config: { setter: IPublicTypeFieldConfig['setter'] }) {
    let { setter } = config;

    // 1. validElement
    // 2. IPublicTypeSetterConfig
    // 3. IPublicTypeSetterConfig[]
    if (Array.isArray(setter)) {
      setter = setter[0];
    } else if (isValidElement(setter) && (setter.type as { displayName?: string }).displayName === 'MixedSetter') {
      setter = (setter.props as { setters?: any[] } | undefined)?.setters?.[0];
    } else if (typeof setter === 'object' && (setter as IPublicTypeSetterConfig).componentName === 'MixedSetter') {
      const setters = (setter as { props?: { setters?: any[] } })?.props?.setters;
      setter = Array.isArray(setters) ? setters[0] : setter;
    }

    /**
     * 两种方式标识是 FC 而不是动态 setter
     * 1. 物料描述里面 setter 的配置，显式设置为 false
     * 2. registerSetter 注册 setter 时显式设置为 false
     */

    let isDynamic = true;

    if (isSetterConfig(setter)) {
      const { componentName, isDynamic: dynamicFlag } = setter as IPublicTypeSetterConfig;
      setter = componentName;
      isDynamic = dynamicFlag !== false;
    }
    if (typeof setter === 'string') {
      const { component, isDynamic: dynamicFlag } = context.setters.getSetter(setter) || {};
      setter = component;
      // 如果在物料配置中声明了，在 registerSetter 没有声明，取物料配置中的声明
      isDynamic = dynamicFlag === undefined ? isDynamic : dynamicFlag !== false;
    }
    if (isDynamicSetter(setter) && isDynamic) {
      try {
        setter = setter.call(context.internalToShellField(), context.internalToShellField());
      } catch (e) { console.error(e); }
    }

    this.setterTransducer = combineTransducer(
      getTransducerFromSetter(setter as SetterLike | null | undefined),
      getHotterFromSetter(setter as SetterLike | null | undefined),
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
