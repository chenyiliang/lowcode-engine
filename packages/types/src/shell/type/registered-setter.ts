import { IPublicModelSettingField } from '../model';
import { IPublicTypeCustomView, IPublicTypeTitleContent } from './';

export interface IPublicTypeRegisteredSetter {
  component: IPublicTypeCustomView;
  defaultProps?: object;
  title?: IPublicTypeTitleContent;

  /**
   * for MixedSetter to check this setter if available
   */
  condition?: (field: IPublicModelSettingField) => boolean;

  /**
   * for MixedSetter to manual change to this setter
   */
  initialValue?: any | ((field: IPublicModelSettingField) => any);
  recommend?: boolean;
  // 标识是否为动态 setter，默认为 true
  isDynamic?: boolean;

  /**
   * 该 setter 适用的值类型**名称**，MixedSetter 据此挑选可用 setter。
   * 运行时是字符串数组（如 ['JSExpression']、['object','array']、['JSSlot']），
   * MixedSetter 会做 `item === usedItem` 的字符串比较，默认值 ['string']。
   *
   * 注意与 IPublicTypeSetterConfig.valueType 的区别：那个声明为
   * IPublicTypeCompositeValue[]（复合值本身），而注册表这里是「类型名」，语义不同，
   * 用 string[] 才与实际用法一致（engine-ext 的 mixed-setter 局部标注也是 string[]，
   * 若这里写宽类型会因函数参数逆变导致 forEach 回调报 TS2345）。
   */
  valueType?: string[];
}
