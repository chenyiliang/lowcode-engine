/**
 * ignitor 调试入口：把 engine 与 react-simulator-renderer 合并成一份 IIFE，
 * 分别挂到 window.AliLowCodeEngine 与 window.SimulatorRenderer，
 * 供本地代理调试（iframe 里通过 <script src> 加载经典脚本）使用。
 *
 * 对应旧 build.json 的两个 entry（AliLowCodeEngine / ReactSimulatorRenderer）。
 * Vite 的 iife/umd 格式不支持多 entry，故这里合并为单入口，两个全局都挂上。
 */
import * as AliLowCodeEngine from '@alilc/lowcode-engine';
import '@alilc/lowcode-react-simulator-renderer';

if (typeof window !== 'undefined') {
  (window as any).AliLowCodeEngine = AliLowCodeEngine;
}

export default AliLowCodeEngine;
