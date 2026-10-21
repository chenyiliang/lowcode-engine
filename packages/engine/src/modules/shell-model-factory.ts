import {
  INode,
  ISettingField,
} from '@alilc/lowcode-designer';
import { IShellModelFactory, IPublicModelNode, IPublicModelSettingField } from '@alilc/lowcode-types';
import {
  Node,
  SettingField,
} from '@alilc/lowcode-shell';
class ShellModelFactory implements IShellModelFactory {
  createNode(node: INode | null | undefined): IPublicModelNode | null {
    return Node.create(node);
  }
  createSettingField(prop: ISettingField): IPublicModelSettingField {
    return SettingField.create(prop);
  }
}
export const shellModelFactory = new ShellModelFactory();