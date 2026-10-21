/* eslint-disable no-param-reassign */
import { IPublicTypeAssetsJson, IPublicTypeComponentDescription, IPublicTypeComponentSchema, IPublicTypePackage, IPublicTypeRemoteComponentDescription } from '@alilc/lowcode-types';

// TODO: 该转换逻辑未来需要消化掉
export function assetsTransform(assets: IPublicTypeAssetsJson) {
  const { components, packages } = assets;
  const packageMaps = (packages || []).reduce((acc: Record<string, IPublicTypePackage>, cur: IPublicTypePackage) => {
    const key = cur.id || cur.package || '';
    acc[key] = cur;
    return acc;
  }, {} as any);
  components.forEach((componentDesc: IPublicTypeComponentDescription | IPublicTypeRemoteComponentDescription) => {
    let { devMode, schema, reference } = componentDesc;
    if ((devMode as string) === 'lowcode') {
      devMode = 'lowCode';
    } else if (devMode === 'proCode') {
      devMode = 'proCode';
    }
    if (devMode) {
      componentDesc.devMode = devMode;
    }
    if (devMode === 'lowCode' && !schema && reference) {
      const referenceId = reference.id || '';
      // 低代码物料的 schema 直接透传引用包里的 schema。
      // 上游 types 里 IPublicTypePackage.schema 声明为 IPublicTypeProjectSchema<IPublicTypeComponentSchema>，
      // 而物料描述的 schema 字段声明为 IPublicTypeComponentSchema，两者类型不完全一致（历史遗留），
      // 运行时是直接透传，这里保持原有行为，仅在赋值处做局部断言。
      componentDesc.schema = packageMaps[referenceId].schema as IPublicTypeComponentSchema | undefined;
    }
  });
  return assets;
}