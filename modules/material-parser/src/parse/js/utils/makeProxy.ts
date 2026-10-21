function makeProxy(target: { [name: string]: any }, meta: any = {}): any {
  if (target.__isProxy) {
    const value = target.__getRaw();
    const rawMeta = target.__getMeta();
    return makeProxy(value, Object.assign({}, rawMeta, meta));
  }
  return new Proxy(target, {
    // Proxy 的 get 陷阱第二参数是 string | symbol（TS 4.x 起 lib 定义收紧），
    // 原先写 string | number 在新版 lib 下不再兼容。
    get: (obj, prop: string | symbol) => {
      if (prop === '__isProxy') return true;
      if (prop === '__getRaw') return () => target;
      if (prop === '__getMeta') return () => meta;
      // obj 的类型是 { [name: string]: any }，而 prop 可能是 symbol，
      // 这里按可索引任意键的对象来取值（运行时 JS 对象本就支持 symbol 键）。
      const raw = obj as Record<string | symbol, any>;
      return Object.prototype.hasOwnProperty.call(meta, prop) ? meta[prop] : raw[prop];
    },
    has: (obj, prop) => {
      return (
        Object.prototype.hasOwnProperty.call(obj, prop) ||
        Object.prototype.hasOwnProperty.call(meta, prop)
      );
    },
  });
}

export default makeProxy;
