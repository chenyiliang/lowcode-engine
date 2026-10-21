import { IPublicTypeIconType, IPublicTypeI18nData, IPublicTypeTitleConfig, IPublicTypeTitleContent, TipContent } from '@alilc/lowcode-types';
import { isI18nData, isTitleConfig } from '@alilc/lowcode-utils';
import { isValidElement, JSXElementConstructor, ReactNode } from 'react';

/** 可以作为标题 label 使用的值：i18n 数据或任意 ReactNode */
type TitleLabel = IPublicTypeI18nData | ReactNode;

export function composeTitle(title?: IPublicTypeTitleContent, icon?: IPublicTypeIconType, tip?: TipContent, tipAsTitle?: boolean, noIcon?: boolean) {
  let _title: IPublicTypeTitleContent | undefined;
  // 原实现会把 tip 重新赋值（含置为 null），参数类型 TipContent 不含 null，
  // 这里用局部变量承接，保持与原先完全一致的运行时行为（null 与 undefined 不混用）。
  let _tip: TipContent | null | undefined = tip;
  if (!title) {
    _title = {};
    if (!icon || tipAsTitle) {
      // tipAsTitle：把 tip 当作标题文本使用。TipContent 里还包含「tip 配置对象」形态，
      // 那种形态不能作为 label，这里按 label 兼容的值取用。
      _title = {
        label: _tip as TitleLabel | undefined,
      };
      _tip = undefined;
    }
  } else {
    _title = title;
  }

  if (icon || _tip) {
    if (typeof _title !== 'object' || isValidElement(_title) || isI18nData(_title)) {
      if (isValidElement(_title)) {
        // _title.type 是标签名（如 'svg'）或组件；组件上可能挂着静态 getIcon，
        // 而 JSXElementConstructor 类型并不声明它，这里按「可能带 getIcon 的组件」读取。
        const titleType = _title.type as string | (JSXElementConstructor<any> & { getIcon?: unknown });
        if (titleType === 'svg' || (typeof titleType !== 'string' && titleType.getIcon)) {
          if (!icon) {
            icon = _title;
          }
          if (tipAsTitle) {
            _title = _tip;
            _tip = null;
          } else {
            _title = undefined;
          }
        }
      }
      // 能进入这个分支，说明 _title「不是普通对象，或是 React 元素，或是 i18n 数据」，
      // 即它不会是 TitleConfig，因此可以安全地当作 label 使用（原逻辑即如此）。
      _title = {
        label: _title as TitleLabel | undefined,
        icon,
        tip: _tip,
      };
    } else {
      _title = {
        ...(_title as IPublicTypeTitleConfig),
        icon,
        tip: _tip,
      };
    }
  }
  if (isTitleConfig(_title) && noIcon) {
    if (!isValidElement(_title)) {
      _title.icon = undefined;
    }
  }
  return _title;
}
