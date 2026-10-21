// @todo 改成 hooks
import React, { Component } from 'react';
import classNames from 'classnames';
import { intl } from '@alilc/lowcode-editor-core';
import { IconArrow } from '../../icons/arrow';
import { IconExit } from '../../icons/exit';
import { Stage as StageWidget } from '../../widget/stage';
import { isTitleConfig } from '@alilc/lowcode-utils';

export const StageDefaultProps = {
  current: false,
};

export type StageProps = typeof StageDefaultProps & {
  stage?: StageWidget;
  current: boolean;
  direction?: string;
};

export default class Stage extends Component<StageProps> {
  static defaultProps = StageDefaultProps;

  private timer: number;

  private additionClassName: string | null;

  private shell: any;

  componentDidMount() {
    this.doSkate();
  }

  componentDidUpdate() {
    this.doSkate();
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer);
  }

  doSkate() {
    window.clearTimeout(this.timer);
    if (this.additionClassName) {
      this.timer = window.setTimeout(() => {
        const elem = this.shell;
        if (elem) {
          if (this.props.current) {
            elem.classList.remove(this.additionClassName);
          } else {
            elem.classList.add(this.additionClassName);
          }
          this.additionClassName = null;
        }
      }, 15);
    }
  }

  render() {
    const { stage, current, direction } = this.props;
    const content = stage?.getContent();
    const { title } = stage!;
    // title 可能是 i18n 数据（IPublicTypeI18nData），它本身不是合法的 ReactNode，
    // 直接渲染会报 TS2322。用 intl() 归一化：i18n 数据会被翻译成文本，
    // 其余（字符串 / React 元素等）原样返回，结果是可渲染的 ReactNode。
    const newTitle = intl(isTitleConfig(title) ? title.label : title);

    if (current) {
      if (direction) {
        this.additionClassName = `skeleton-stagebox-stagein-${direction}`;
      }
    } else if (direction) {
      this.additionClassName = `skeleton-stagebox-stageout-${direction}`;
    }

    const className = classNames(
      'skeleton-stagebox-stage',
      {
        'skeleton-stagebox-refer': !current,
      },
      this.additionClassName,
    );

    const stageBacker = stage?.hasBack() ? (
      <div className="skeleton-stagebox-stagebacker">
        <IconArrow className="skeleton-stagebox-stage-arrow" size="medium" data-stage-target="stageback" />
        <span className="skeleton-stagebox-stage-title">{newTitle}</span>
        <IconExit className="skeleton-stagebox-stage-exit" size="medium" data-stage-target="stageexit" />
      </div>
    ) : null;

    return (
      <div
        ref={(ref) => {
          this.shell = ref;
        }}
        className={className}
      >
        {stageBacker}
        <div className="skeleton-stagebox-stage-content">{content}</div>
      </div>
    );
  }
}
