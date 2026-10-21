/**
 * just for legao
 * @author: jiushen
 */
// 需要通过 Env 来判断是否需要

import { some } from 'lodash';

/**
 * legao 的样式运行时结构：
 * - 叶子层是「属性名 -> 属性值」的扁平映射
 * - 顶层可以用伪类（default / hover / focus ...）再嵌一层扁平映射
 * - `extra` 用于原样透传无法解析的 css 片段
 */
type StyleValue = string | string[] | StyleObject;

interface StyleObject {
  [key: string]: StyleValue;
}

interface CssRuntime {
  extra?: string[];
  default?: Record<string, string>;
  [pseudo: string]: string[] | Record<string, string> | undefined;
}

const pseudoMap = ['hover', 'focus', 'active', 'visited'];

const RE_CAMEL = /[A-Z]/g;
const RE_HYPHEN = /[-\s]+(.)?/g;
const PROPS_REG = /([^:]*):\s?(.*)/i;

// 给 css 分组
function groupingCss(css: string) {
  let stackLength = 0;
  let startIndex = 0;
  const group: string[] = [];
  css.split('').forEach((char, index) => {
    if (char === '{') {
      stackLength++;
    }
    if (char === '}') {
      if (stackLength === 1) {
        group.push(css.substring(startIndex, index + 1));
        startIndex = index + 1;
      }
      stackLength--;
    }
  });
  return group;
}

function isString(str: any): str is string {
  return {}.toString.call(str) === '[object String]';
}

function hyphenate(str: string): string {
  return str.replace(RE_CAMEL, w => `-${w}`).toLowerCase();
}

function camelize(str: string): string {
  return str.replace(RE_HYPHEN, (m, w) => (w ? w.toUpperCase() : ''));
}

/** 扁平样式：属性名 -> 属性值 */
type FlatStyle = Record<string, string>;

/**
 * convert
 * {background-color: "red"}
 * to
 * background-color: red;
 */
function runtimeToCss(runtime: StyleObject) {
  const css: string[] = [];
  Object.keys(runtime).forEach((key) => {
    css.push(`  ${key}: ${runtime[key]};`);
  });
  return css.join('\n');
}

function toNativeStyle(runtime: StyleObject | undefined): StyleObject {
  if (!runtime) {
    return {};
  }
  if (runtime.default) {
    const normalized: StyleObject = {};
    Object.keys(runtime).forEach((pseudo) => {
      if (pseudo === 'extra') {
        normalized[pseudo] = runtime[pseudo];
        return;
      }
      normalized[pseudo] = toNativeStyle(runtime[pseudo] as StyleObject);
    });
    return normalized;
  }

  const normalized: StyleObject = {};
  Object.keys(runtime).forEach((key) => {
    normalized[camelize(key)] = runtime[key];
  });
  return normalized;
}

function normalizeStyle(style?: StyleObject): StyleObject {
  if (!style) {
    return {};
  }
  if (style.default) {
    const normalized: StyleObject = {};
    Object.keys(style).forEach((pseudo) => {
      if (pseudo === 'extra') {
        normalized[pseudo] = style[pseudo];
        return;
      }
      normalized[pseudo] = normalizeStyle(style[pseudo] as StyleObject);
    });
    return normalized;
  }

  const normalized: StyleObject = {};
  Object.keys(style).forEach((key) => {
    normalized[hyphenate(key)] = style[key];
  });
  return normalized;
}

function toCss(runtime?: CssRuntime): string {
  if (!runtime) {
    return (
      `:root {

}`);
  }

  if (runtime.default) {
    const css: string[] = [];
    Object.keys(runtime).forEach((pseudo) => {
      if (pseudo === 'extra') {
        Array.isArray(runtime.extra) && css.push(runtime.extra.join('\n'));
        return;
      }
      // 只需要对这四种做兼容
      const prefix = pseudoMap.indexOf(pseudo) > -1 ? ':' : '';
      css.push(
        `:root${pseudo === 'default' ? '' : `${prefix}${pseudo}`} {
${runtimeToCss(normalizeStyle(runtime[pseudo] as StyleObject))}
}\n`,
);
    });
    return css.join('\n');
  }

  // 走到这里说明 runtime 没有伪类分层，本身就是一层扁平样式
  return (
    `:root {
${runtimeToCss(normalizeStyle(runtime as StyleObject))}
}
`
  );
}

function cssToRuntime(css: string): CssRuntime {
  if (!css) {
    return {};
  }
  const runtime: CssRuntime = {};
  const groups = groupingCss(css);
  groups.forEach((cssItem) => {
    if (!cssItem.startsWith(':root')) {
      runtime.extra = runtime.extra || [];
      runtime.extra.push(cssItem.trim());
    } else {
      const res = /:root:?(.*)?{(.*)/ig.exec(cssItem.replace(/[\r\n]+/ig, '').trim());
      if (res) {
        let pseudo: string | undefined;

        if (res[1] && res[1].trim() && some(pseudoMap, pse => res[1].indexOf(pse) === 0)) {
          pseudo = res[1].trim();
        } else if (res[1] && res[1].trim()) {
          pseudo = res[1];
        }

        const s: Record<string, string> = {};
        res[2].split(';').reduce<string[]>((prev, next) => {
          if (next.indexOf('base64') > -1) {
            prev[prev.length - 1] += `;${next}`;
          } else {
            prev.push(next);
          }
          return prev;
        }, []).forEach((item) => {
          if (item) {
            if (PROPS_REG.test(item)) {
              const props = item.match(PROPS_REG);
              const key = props?.[1];
              const value = props?.[2];
              if (key && value) {
                s[key.trim()] = value.trim();
              }
            }
          }
        });

        runtime[pseudo || 'default'] = s;
      }
    }
  });
  return runtime;
}

function cssToStyle(css: string | StyleObject): StyleObject {
  try {
    if (isString(css)) {
      return toNativeStyle(cssToRuntime(css).default);
    }
    if (css.default) {
      return toNativeStyle(normalizeStyle(css.default as StyleObject));
    }
    return toNativeStyle(normalizeStyle(css));
  } catch (e) {
    // do nothing
  }
  return {};
}

export {
  hyphenate,
  camelize,
  toNativeStyle,
  normalizeStyle,
  toCss,
  cssToRuntime,
  cssToStyle,
};
