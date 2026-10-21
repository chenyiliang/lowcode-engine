import { Component } from 'react';
import classNames from 'classnames';
import BuiltinDragGhostComponent from './drag-ghost';
import { Designer, DesignerProps } from './designer';
import { ProjectView } from '../project';
import './designer.less';

type IProps = DesignerProps & {
  designer?: Designer;
};

export class DesignerView extends Component<IProps> {
  readonly designer: Designer;
  readonly viewName: string | undefined;

  constructor(props: IProps) {
    super(props);
    const { designer, ...designerProps } = props;
    this.viewName = designer?.viewName;
    if (designer) {
      this.designer = designer;
      designer.setProps(designerProps);
    } else {
      this.designer = new Designer(designerProps);
    }
    // React 19 移除了 UNSAFE_componentWillMount。
    // 原本挂载前调用 this.designer.purge() 做一次性清理，改到构造函数里执行
    // （同样在首次 render / mount 之前运行一次，语义等价）。
    this.designer.purge();
  }

  shouldComponentUpdate(nextProps: DesignerProps) {
    this.designer.setProps(nextProps);
    const { props } = this;
    if (
      nextProps.className !== props.className ||
      nextProps.style !== props.style ||
      nextProps.dragGhostComponent !== props.dragGhostComponent
    ) {
      return true;
    }
    return false;
  }

  componentDidMount() {
    const { onMount } = this.props;
    if (onMount) {
      onMount(this.designer);
    }
    this.designer.postEvent('mount', this.designer);
  }

  render() {
    const { className, style, dragGhostComponent } = this.props;
    const DragGhost = dragGhostComponent || BuiltinDragGhostComponent;

    return (
      <div className={classNames('lc-designer', className)} style={style}>
        <DragGhost designer={this.designer} />
        <ProjectView designer={this.designer} />
      </div>
    );
  }
}
