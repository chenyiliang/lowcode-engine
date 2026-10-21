import { action, makeObservable, obx, engineConfig, IEditor, FocusTracker } from '@alilc/lowcode-editor-core';
import {
  DockConfig,
  WidgetConfig,
  PanelDockConfig,
  DialogDockConfig,
  isDockConfig,
  isPanelDockConfig,
  isPanelConfig,
  DividerConfig,
  isDividerConfig,
} from './types';
import { isPanel, Panel } from './widget/panel';
import { WidgetContainer } from './widget/widget-container';
import { Area } from './area';
import { isWidget, IWidget, Widget } from './widget/widget';
import { PanelDock } from './widget/panel-dock';
import { Dock } from './widget/dock';
import { Stage, StageConfig } from './widget/stage';
import { isValidElement } from 'react';
import { isPlainObject, uniqueId, Logger } from '@alilc/lowcode-utils';
import { Divider } from '@alifd/next';
import {
  EditorConfig,
  PluginClassSet,
  IPublicTypeWidgetBaseConfig,
  IPublicTypeWidgetConfigArea,
  IPublicTypeSkeletonConfig,
  IPublicApiSkeleton,
  IPublicTypeConfigTransducer,
  IPublicTypePanelConfig,
} from '@alilc/lowcode-types';

const logger = new Logger({ level: 'warn', bizName: 'skeleton' });

export enum SkeletonEvents {
  PANEL_DOCK_ACTIVE = 'skeleton.panel-dock.active',
  PANEL_DOCK_UNACTIVE = 'skeleton.panel-dock.unactive',
  PANEL_SHOW = 'skeleton.panel.show',
  PANEL_HIDE = 'skeleton.panel.hide',
  WIDGET_SHOW = 'skeleton.widget.show',
  WIDGET_HIDE = 'skeleton.widget.hide',
  WIDGET_DISABLE = 'skeleton.widget.disable',
  WIDGET_ENABLE = 'skeleton.widget.enable',
}

export interface ISkeleton extends Omit<IPublicApiSkeleton,
  'showPanel' |
  'hidePanel' |
  'showWidget' |
  'enableWidget' |
  'hideWidget' |
  'disableWidget' |
  'showArea' |
  'onShowPanel' |
  'onHidePanel' |
  'onShowWidget' |
  'onHideWidget' |
  'remove' |
  'hideArea' |
  // 下面这三个是 shell 层 API：shell 的 Skeleton 直接用 editor.eventBus + area.container.items
  // 实现（见 packages/shell/src/api/skeleton.ts），内部 Skeleton 并不需要也没有实现它们，
  // 与上面 showPanel / onShowWidget 等被 Omit 的原因一致。
  'getAreaItems' |
  'onDisableWidget' |
  'onEnableWidget' |
  'add'
> {
  editor: IEditor;

  readonly leftArea: Area<DockConfig | PanelDockConfig | DialogDockConfig>;

  readonly topArea: Area<DockConfig | DividerConfig | PanelDockConfig | DialogDockConfig>;

  readonly subTopArea: Area<DockConfig | DividerConfig | PanelDockConfig | DialogDockConfig>;

  readonly toolbar: Area<DockConfig | DividerConfig | PanelDockConfig | DialogDockConfig>;

  readonly leftFixedArea: Area<IPublicTypePanelConfig, Panel>;

  readonly leftFloatArea: Area<IPublicTypePanelConfig, Panel>;

  readonly rightArea: Area<IPublicTypePanelConfig, Panel>;

  readonly mainArea: Area<WidgetConfig | IPublicTypePanelConfig, Widget | Panel>;

  readonly bottomArea: Area<IPublicTypePanelConfig, Panel>;

  readonly stages: Area<StageConfig, Stage>;

  readonly widgets: IWidget[];

  readonly focusTracker: FocusTracker;

  getPanel(name: string): Panel | undefined;

  getWidget(name: string): IWidget | undefined;

  buildFromConfig(config?: EditorConfig, components?: PluginClassSet): void;

  /**
   * 向 editor.eventBus 派发骨架事件。
   * 具体 Skeleton 类一直有此方法，之前漏在接口上声明，
   * 导致 widget-views 等消费方（拿到的是 ISkeleton）读取时报 TS2339。
   */
  postEvent(event: SkeletonEvents, ...args: any[]): void;

  /**
   * 在「左侧固定区」与「左侧浮动区」之间切换面板。
   * 同样属于具体 Skeleton 类已有、但接口漏声明的方法（panel-operation-row 会调用它）。
   */
  toggleFloatStatus(panel: Panel): void;

  createStage(config: any): string | undefined;

  getStage(name: string): Stage | null;

  createContainer(
    name: string,
    handle: (item: any) => any,
    exclusive?: boolean,
    checkVisible?: () => boolean,
    defaultSetCurrent?: boolean,
  ): WidgetContainer;

  createPanel(config: IPublicTypePanelConfig): Panel;

  add(config: IPublicTypeSkeletonConfig, extraConfig?: Record<string, any>): IWidget | Widget | Panel | Stage | Dock | PanelDock | undefined;
}

export class Skeleton implements ISkeleton {
  private panels = new Map<string, Panel>();

  private configTransducers: IPublicTypeConfigTransducer[] = [];

  private containers = new Map<string, WidgetContainer<any>>();

  readonly leftArea: Area<DockConfig | PanelDockConfig | DialogDockConfig>;

  readonly topArea: Area<DockConfig | DividerConfig | PanelDockConfig | DialogDockConfig>;

  readonly subTopArea: Area<DockConfig | DividerConfig | PanelDockConfig | DialogDockConfig>;

  readonly toolbar: Area<DockConfig | DividerConfig | PanelDockConfig | DialogDockConfig>;

  readonly leftFixedArea: Area<IPublicTypePanelConfig, Panel>;

  readonly leftFloatArea: Area<IPublicTypePanelConfig, Panel>;

  readonly rightArea: Area<IPublicTypePanelConfig, Panel>;

  @obx readonly mainArea: Area<WidgetConfig | IPublicTypePanelConfig, Widget | Panel>;

  readonly bottomArea: Area<IPublicTypePanelConfig, Panel>;

  readonly stages: Area<StageConfig, Stage>;

  readonly widgets: IWidget[] = [];

  readonly focusTracker = new FocusTracker();

  constructor(readonly editor: IEditor, readonly viewName: string = 'global') {
    makeObservable(this);
    this.leftArea = new Area(
      this,
      'leftArea',
      (config) => {
        if (isWidget(config)) {
          return config;
        }
        return this.createWidget(config);
      },
      false,
    );
    this.topArea = new Area(
      this,
      'topArea',
      (config) => {
        if (isWidget(config)) {
          return config;
        }
        return this.createWidget(config);
      },
      false,
    );
    this.subTopArea = new Area(
      this,
      'subTopArea',
      (config) => {
        if (isWidget(config)) {
          return config;
        }
        return this.createWidget(config);
      },
      false,
    );
    this.toolbar = new Area(
      this,
      'toolbar',
      (config) => {
        if (isWidget(config)) {
          return config;
        }
        return this.createWidget(config);
      },
      false,
    );
    this.leftFixedArea = new Area(
      this,
      'leftFixedArea',
      (config) => {
        if (isPanel(config)) {
          return config;
        }
        return this.createPanel(config);
      },
      true,
    );
    this.leftFloatArea = new Area(
      this,
      'leftFloatArea',
      (config) => {
        if (isPanel(config)) {
          return config;
        }
        return this.createPanel(config);
      },
      true,
    );
    this.rightArea = new Area(
      this,
      'rightArea',
      (config) => {
        if (isPanel(config)) {
          return config;
        }
        return this.createPanel(config);
      },
      false,
      true,
    );
    this.mainArea = new Area(
      this,
      'mainArea',
      (config) => {
        if (isWidget(config)) {
          return config as Widget;
        }
        return this.createWidget(config) as Widget;
      },
      true,
      true,
    );
    this.bottomArea = new Area(
      this,
      'bottomArea',
      (config) => {
        if (isPanel(config)) {
          return config;
        }
        return this.createPanel(config);
      },
      true,
    );
    this.stages = new Area(this, 'stages', (config) => {
      if (isWidget(config)) {
        return config;
      }
      return new Stage(this, config);
    });

    this.setupPlugins();
    this.setupEvents();
    this.focusTracker.mount(window);
  }

  /**
   * setup events
   *
   * @memberof Skeleton
   */
  setupEvents() {
    // adjust pinned status when panel shown
    this.editor.eventBus.on(SkeletonEvents.PANEL_SHOW, (panelName, panel) => {
      const panelNameKey = `${panelName}-pinned-status-isFloat`;
      const isInFloatAreaPreferenceExists = engineConfig.getPreference()?.contains(panelNameKey, 'skeleton');
      if (isInFloatAreaPreferenceExists) {
        const isInFloatAreaFromPreference = engineConfig.getPreference()?.get(panelNameKey, 'skeleton');
        const isCurrentInFloatArea = panel?.isChildOfFloatArea();
        if (isInFloatAreaFromPreference !== isCurrentInFloatArea) {
          this.toggleFloatStatus(panel);
        }
      }
    });
  }

  /**
   * set isFloat status for panel
   *
   * @param {*} panel
   * @memberof Skeleton
   */
  @action
  toggleFloatStatus(panel: Panel) {
    const isFloat = panel?.parent?.name === 'leftFloatArea';
    if (isFloat) {
      this.leftFloatArea.remove(panel);
      this.leftFixedArea.add(panel);
      this.leftFixedArea.container.active(panel);
    } else {
      this.leftFixedArea.remove(panel);
      this.leftFloatArea.add(panel);
      this.leftFloatArea.container.active(panel);
    }
    engineConfig.getPreference().set(`${panel.name}-pinned-status-isFloat`, !isFloat, 'skeleton');
  }

  buildFromConfig(config?: EditorConfig, components: PluginClassSet = {}) {
    if (config) {
      this.editor.init(config, components);
    }
    this.setupPlugins();
  }

  private setupPlugins() {
    const { config, components = {} } = this.editor;
    if (!config) {
      return;
    }

    const { plugins } = config;
    if (!plugins) {
      return;
    }
    Object.keys(plugins).forEach((area) => {
      plugins[area].forEach((item) => {
        const { pluginKey, type, props = {}, pluginProps } = item;
        const config: IPublicTypeWidgetBaseConfig = {
          area: area as IPublicTypeWidgetConfigArea,
          type: 'Widget',
          name: pluginKey,
          contentProps: pluginProps,
        };
        const { dialogProps, balloonProps, panelProps, linkProps, ...restProps } = props;
        config.props = restProps;
        if (dialogProps) {
          config.dialogProps = dialogProps;
        }
        if (balloonProps) {
          config.balloonProps = balloonProps;
        }
        if (panelProps) {
          config.panelProps = panelProps;
        }
        if (linkProps) {
          config.linkProps = linkProps;
        }
        if (type === 'TabPanel') {
          config.type = 'Panel';
        } else if (/Icon$/.test(type)) {
          config.type = type.replace('Icon', 'Dock');
        }
        if (pluginKey in components) {
          config.content = components[pluginKey];
        }
        this.add(config);
      });
    });
  }

  postEvent(event: SkeletonEvents, ...args: any[]) {
    this.editor.eventBus.emit(event, ...args);
  }

  createWidget(config: IPublicTypeWidgetBaseConfig | IWidget) {
    if (isWidget(config)) {
      return config;
    }

    config = this.parseConfig(config);
    let widget: IWidget;
    if (isDockConfig(config)) {
      if (isPanelDockConfig(config)) {
        widget = new PanelDock(this, config);
      } else if (false) {
        // DialogDock
        // others...
      } else {
        widget = new Dock(this, config);
      }
    } else if (isDividerConfig(config)) {
      widget = new Widget(this, {
        ...config,
        type: 'Widget',
        content: Divider,
      });
    } else if (isPanelConfig(config)) {
      widget = this.createPanel(config);
    } else {
      widget = new Widget(this, config as WidgetConfig);
    }
    this.widgets.push(widget);
    return widget;
  }

  getWidget(name: string): IWidget | undefined {
    return this.widgets.find(widget => widget.name === name);
  }

  createPanel(config: IPublicTypePanelConfig) {
    const parsedConfig = this.parseConfig(config);
    const panel = new Panel(this, parsedConfig as IPublicTypePanelConfig);
    this.panels.set(panel.name, panel);
    logger.debug(`Panel created with name: ${panel.name} \nconfig:`, config, '\n current panels: ', this.panels);
    return panel;
  }

  getPanel(name: string): Panel | undefined {
    return this.panels.get(name);
  }

  getStage(name: string) {
    return this.stages.container.get(name);
  }

  createStage(config: any) {
    const stage = this.add({
      name: uniqueId('stage'),
      area: 'stages',
      ...config,
    });
    return stage?.getName?.();
  }

  createContainer(
    name: string,
    handle: (item: any) => any,
    exclusive = false,
    checkVisible: () => boolean = () => true,
    defaultSetCurrent = false,
  ) {
    const container = new WidgetContainer(name, handle, exclusive, checkVisible, defaultSetCurrent);
    this.containers.set(name, container);
    return container;
  }

  private parseConfig(config: IPublicTypeWidgetBaseConfig) {
    if (config.parsed) {
      return config;
    }
    const { content, ...restConfig } = config;
    if (content) {
      if (isPlainObject(content) && !isValidElement(content)) {
        // isPlainObject 的类型守卫是 `value is any`，并不会把 content 收窄成「可索引对象」，
        // 所以这里显式按记录读取（上面已经确认它是普通对象、且不是 React 元素）。
        const contentRecord = content as unknown as Record<string, any>;
        Object.keys(contentRecord).forEach((key) => {
          if (/props$/i.test(key) && restConfig[key]) {
            restConfig[key] = {
              ...restConfig[key],
              ...contentRecord[key],
            };
          } else {
            restConfig[key] = contentRecord[key];
          }
        });
      } else {
        restConfig.content = content;
      }
    }
    restConfig.pluginKey = restConfig.name;
    restConfig.parsed = true;
    return restConfig;
  }

  registerConfigTransducer(
    transducer: IPublicTypeConfigTransducer,
    level = 100,
    id?: string,
  ) {
    transducer.level = level;
    transducer.id = id;
    const i = this.configTransducers.findIndex((item) => item.level != null && item.level > level);
    if (i < 0) {
      this.configTransducers.push(transducer);
    } else {
      this.configTransducers.splice(i, 0, transducer);
    }
  }

  getRegisteredConfigTransducers(): IPublicTypeConfigTransducer[] {
    return this.configTransducers;
  }

  add(config: IPublicTypeSkeletonConfig, extraConfig?: Record<string, any>): IWidget | Widget | Panel | Stage | Dock | PanelDock | undefined {
    const registeredTransducers = this.getRegisteredConfigTransducers();

    const parsedConfig = registeredTransducers.reduce((prevConfig, current) => {
      return current(prevConfig);
    }, {
      ...this.parseConfig(config),
      ...extraConfig,
    });

    let { area } = parsedConfig;
    if (!area) {
      if (parsedConfig.type === 'Panel') {
        area = 'leftFloatArea';
      } else if (parsedConfig.type === 'Widget') {
        area = 'mainArea';
      } else {
        area = 'leftArea';
      }
    }
    switch (area) {
      case 'leftArea':
      case 'left':
        return this.leftArea.add(parsedConfig as PanelDockConfig);
      case 'rightArea':
      case 'right':
        return this.rightArea.add(parsedConfig as IPublicTypePanelConfig);
      case 'topArea':
      case 'top':
        return this.topArea.add(parsedConfig as PanelDockConfig);
      case 'subTopArea':
        return this.subTopArea.add(parsedConfig as PanelDockConfig);
      case 'toolbar':
        return this.toolbar.add(parsedConfig as PanelDockConfig);
      case 'mainArea':
      case 'main':
      case 'center':
      case 'centerArea':
        return this.mainArea.add(parsedConfig as IPublicTypePanelConfig);
      case 'bottomArea':
      case 'bottom':
        return this.bottomArea.add(parsedConfig as IPublicTypePanelConfig);
      case 'leftFixedArea':
        return this.leftFixedArea.add(parsedConfig as IPublicTypePanelConfig);
      case 'leftFloatArea':
        return this.leftFloatArea.add(parsedConfig as IPublicTypePanelConfig);
      case 'stages':
        return this.stages.add(parsedConfig as StageConfig);
      default:
        // do nothing
    }
  }
}
