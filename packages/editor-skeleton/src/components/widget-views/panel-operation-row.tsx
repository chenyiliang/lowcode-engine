import { Component, Fragment } from 'react';
import { Button, Icon } from '@alifd/next';
import { action, makeObservable } from '@alilc/lowcode-editor-core';
import { IconFix } from '../../icons/fix';
import { IconFloat } from '../../icons/float';
import { Panel } from '../../widget/panel';

export default class PanelOperationRow extends Component<{ panel: Panel }> {
  constructor(props: { panel: Panel }) {
    super(props);
    makeObservable(this);
  }
  // fix or float
  @action
  setDisplay() {
    const { panel } = this.props;
    const current = panel;
    if (!current) {
      return;
    }

    panel.skeleton.toggleFloatStatus(panel);
  }

  render() {
    const { panel } = this.props;
    const isRightArea = this.props.panel.config?.area === 'rightArea';
    if (isRightArea) {
      return null;
    }
    // can be set fixed by default
    let canSetFixed = true;
    if (panel?.config.props?.canSetFixed === false) {
      canSetFixed = false;
    }

    const hideTitleBar = panel?.config.props?.hideTitleBar;

    const areaName = panel?.parent?.name;
    // areaName 可能是 undefined，且 ISkeleton 上没有按名字取区域的索引签名；
    // 这里按名字取出对应区域（leftFloatArea / leftFixedArea 等），只用到 setVisible。
    const area = areaName
      ? (panel.skeleton as unknown as Record<string, { setVisible(flag: boolean): void } | undefined>)[areaName]
      : undefined;

    return (
      <Fragment>
        {!hideTitleBar && (
          <Fragment>
            {canSetFixed && (
              // eslint-disable-next-line react/jsx-no-bind
              <Button text className="lc-pane-icon-fix" onClick={this.setDisplay.bind(this)}>
                {areaName === 'leftFloatArea' ? <IconFix /> : <IconFloat />}
              </Button>
            )}
            <Button
              text
              className="lc-pane-icon-close"
              onClick={() => {
                area && area.setVisible(false);
              }}
            >
              <Icon type="close" />
            </Button>
          </Fragment>
        )}
      </Fragment>
    );
  }
}
