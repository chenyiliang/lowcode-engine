// emitDecoratorMetadata + isolatedModules 下，被 @obx/@computed 等装饰器标注的字段所引用的类型
// 必须用 import type 引入；这几个都是纯接口（不作值使用），整体用 import type 即可。
import type {
  INode,
  IDesigner,
  ISelection,
  ISettingTopEntry,
} from '@alilc/lowcode-designer';
import { Editor, obx, computed, makeObservable, action, IEventBus, createModuleEventBus } from '@alilc/lowcode-editor-core';

function generateSessionId(nodes: INode[]) {
  return nodes
    .map((node) => node.id)
    .sort()
    .join(',');
}

export class SettingsMain {
  private emitter: IEventBus = createModuleEventBus('SettingsMain');

  private _sessionId = '';

  @obx.ref private _settings?: ISettingTopEntry;

  @computed get length(): number | undefined {
    return this._settings?.nodes.length;
  }

  @computed get componentMeta() {
    return this._settings?.componentMeta;
  }

  @computed get settings() {
    return this._settings;
  }

  private disposeListener: () => void;

  private designer?: IDesigner;

  constructor(readonly editor: Editor) {
    makeObservable(this);
    this.init();
  }

  private async init() {
    const setupSelection = (selection?: ISelection) => {
      if (selection) {
        this.setup(selection.getNodes());
      } else {
        this.setup([]);
      }
    };
    this.editor.eventBus.on('designer.selection.change', setupSelection);
    this.disposeListener = () => {
      this.editor.removeListener('designer.selection.change', setupSelection);
    };
    const designer = await this.editor.onceGot('designer');
    this.designer = designer;
    setupSelection(designer.currentSelection);
  }

  @action
  private setup(nodes: INode[]) {
    // check nodes change
    const sessionId = generateSessionId(nodes);
    if (sessionId === this._sessionId) {
      return;
    }
    this._sessionId = sessionId;
    if (nodes.length < 1) {
      this._settings = undefined;
      return;
    }

    if (!this.designer) {
      // nodes[0] 一定存在（上面 nodes.length < 1 已提前返回）；document 可能为 null，用可选链取值
      this.designer = nodes[0].document?.designer;
    }
    // 用局部变量承接，便于 TS 对 this.designer（可变字段）做收窄
    const designer = this.designer;
    // 当节点只有一个时，复用 node 上挂载的 settingEntry，不会产生平行的两个实例，这样在整个系统中对
    // 某个节点操作的 SettingTopEntry 只有一个实例，后续的 getProp() 也会拿到相同的 SettingField 实例
    if (nodes.length === 1) {
      this._settings = nodes[0].settingEntry;
    } else if (designer) {
      this._settings = designer.createSettingEntry(nodes);
    }
  }

  purge() {
    this.disposeListener();
    this.emitter.removeAllListeners();
  }
}
