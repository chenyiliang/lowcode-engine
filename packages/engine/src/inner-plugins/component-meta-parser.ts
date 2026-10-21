import { IPublicModelPluginContext } from '@alilc/lowcode-types';

export const componentMetaParser = (designer: any) => {
  const fun = (ctx: IPublicModelPluginContext) => {
    return {
      init() {
        const { material } = ctx;
        const build = () => {
          const assets = material.getAssets();
          const { components = [] } = assets || {};
          designer.buildComponentMetasMap(components);
        };
        material.onChangeAssets(build);
        // 补一次「追赶」读取，消除 setAssets 与订阅建立的时序竞态：
        // 若某个插件在本插件 init 之前就 setAssets 了（如 graph 的 PluginCore 在 engine init()
        // 前注册并 setAssets），那次 onChangeAssets 通知无人接收，componentMetasMap 会恒空，
        // 表现为画布组件报 "is not a npm component"、x6 节点退化为小点。
        // 官方线上 demo 没踩到只是因为其 injectAssets 走 CDN 较慢、setAssets 落在订阅之后；
        // 本地/快速网络下必现（实测 demo-graph-x6）。buildComponentMetasMap 按 componentName
        // 去重（已存在则 setMetadata 更新），重复调用是幂等安全的。
        build();
      },
    };
  };

  fun.pluginName = '___component_meta_parser___';

  return fun;
};
