import type { ViewerContext } from './context';
import { escapeHtml } from './escape';

/** Hoja de estilos del visor exportado. */
export function buildViewerCss(ctx: ViewerContext): string {
  const { config, hasPassword, brandLogoPosStyle, resolvedBgImage } = ctx;
  return `    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background-color: ${escapeHtml(config.bgColor)};
      color: #f1f5f9;
    }
    .viewer-root {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: ${hasPassword ? 'none' : 'flex'};
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: hidden;
      background-color: ${escapeHtml(config.bgColor)};
      ${resolvedBgImage ? `background-image: url("${escapeHtml(resolvedBgImage)}"); background-size: cover; background-position: center;` : ''}
    }
    .lock-screen {
      width: 100vw;
      height: 100vh;
      display: ${hasPassword ? 'flex' : 'none'};
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      background: #020617;
      color: #e2e8f0;
      text-align: center;
      padding: 24px;
    }
    .lock-btn {
      padding: 10px 18px;
      border-radius: 8px;
      border: 1px solid #22d3ee;
      background: rgba(34, 211, 238, 0.12);
      color: #67e8f9;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .viewer-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image: radial-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px);
      background-size: 24px 24px;
      ${resolvedBgImage ? `background-color: rgba(2, 6, 23, ${config.bgOverlayOpacity / 100});` : ''}
    }
    .brand-logo-float {
      position: fixed;
      top: 16px;
      ${brandLogoPosStyle}
      z-index: 30;
      width: 44px;
      height: 44px;
      padding: 6px;
      border-radius: 10px;
      border: 1px solid rgba(51, 65, 85, 0.85);
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.15s;
    }
    .brand-logo-float:hover { border-color: rgba(34, 211, 238, 0.75); }
    .brand-logo-float img { width: 100%; height: 100%; object-fit: contain; }
    .stage-viewport {
      position: relative;
      z-index: 10;
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .stage-viewport.pan-ready { cursor: grab; }
    .stage-viewport.pan-active { cursor: grabbing; }
    .zoom-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 90%;
      max-height: 90%;
      transform-origin: center center;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .stf__parent { position: relative; display: block; margin: 0 auto !important; user-select: none; }
    .stf__wrapper { position: relative; margin: 0 auto !important; }
    .spine-shadow {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 48px;
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 200;
      background: linear-gradient(to right, rgba(2,6,23,0) 0%, rgba(2,6,23,0.2) 28%, rgba(2,6,23,0.62) 50%, rgba(2,6,23,0.2) 72%, rgba(2,6,23,0) 100%);
    }
    .nav-circle {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 20;
      width: 44px;
      height: 44px;
      border-radius: 9999px;
      border: 1px solid #1e293b;
      background: rgba(15, 23, 42, 0.9);
      color: #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .nav-circle:hover { color: #22d3ee; border-color: rgba(34, 211, 238, 0.6); }
    .nav-prev { left: 12px; }
    .nav-next { right: 12px; }
    .thumb-strip {
      position: relative;
      z-index: 20;
      margin-top: 8px;
      width: 100%;
      max-width: 820px;
      border-radius: 12px;
      border: 1px solid #1e293b;
      background: rgba(15, 23, 42, 0.95);
      padding: 10px;
      display: none;
      gap: 10px;
      overflow-x: auto;
    }
    .thumb-strip.open { display: flex; }
    .thumb-btn {
      flex-shrink: 0;
      width: 64px;
      height: 86px;
      border-radius: 6px;
      border: 1px solid #334155;
      background: #020617;
      color: #cbd5e1;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      font-size: 9px;
    }
    .thumb-btn.active { border-color: #22d3ee; box-shadow: 0 0 0 2px rgba(34,211,238,0.3); }
    .thumb-btn img { width: 100%; height: 100%; object-fit: contain; }
    .thumb-num {
      position: absolute;
      bottom: 4px;
      right: 4px;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(2,6,23,0.85);
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
    }
    .controls-bar {
      position: relative;
      z-index: 20;
      margin-top: 12px;
      overflow: hidden;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 12px;
      border: 1px solid #1e293b;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
    }
    .reading-progress {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, #34d399, #22d3ee, #34d399);
      transform-origin: left center;
      transform: scaleX(0);
      display: none;
    }
    @keyframes readingFill {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }
    .ctrl-btn {
      height: 34px;
      padding: 0 10px;
      border-radius: 8px;
      border: 0;
      background: transparent;
      color: #cbd5e1;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background-color 0.15s, color 0.15s;
    }
    .ctrl-btn:hover { background: #1e293b; color: #22d3ee; }
    .ctrl-btn.reading-active {
      background: rgba(16, 185, 129, 0.16);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.45);
    }
    .reading-stepper {
      display: inline-flex;
      align-items: center;
      height: 30px;
      padding: 0 2px;
      border-radius: 8px;
      border: 1px solid #1e293b;
      background: rgba(2, 6, 23, 0.72);
    }
    .reading-step-btn {
      width: 24px;
      height: 24px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }
    .reading-step-btn:hover { background: #1e293b; color: #6ee7b7; }
    .reading-sec-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #6ee7b7;
      padding: 0 6px;
      white-space: nowrap;
    }
    .page-counter {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
      font-size: 12px;
      color: #cbd5e1;
      padding: 0 8px;
      white-space: nowrap;
    }
    .ctrl-divider {
      width: 1px;
      height: 20px;
      background: #1e293b;
      margin: 0 2px;
    }
    .my-page,
    .page,
    .gf-page {
      overflow: hidden !important;
      user-select: none;
      box-sizing: border-box;
      background-color: #0f172a;
    }
    .page-content {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden !important;
      box-sizing: border-box;
      background-color: #0f172a;
    }
    .gf-editorial {
      width: 100%; height: 100%; padding: 28px; display: flex; flex-direction: column;
      justify-content: space-between; background: #0f172a; color: #f1f5f9; overflow: hidden;
    }
    .gf-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #22d3ee; }
    .gf-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700; line-height: 1.25; margin-bottom: 10px; color: #22d3ee; }
    .gf-body { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .gf-foot {
      font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #64748b;
      padding-top: 12px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between;
    }
`;
}
