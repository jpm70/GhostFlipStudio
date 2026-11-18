import type { ViewerContext } from './context';
import { escapeHtml } from './escape';

/** Pantalla de bloqueo y estructura HTML del visor. */
export function buildViewerMarkup(ctx: ViewerContext): string {
  const { config, brandUrl, resolvedLogoSrc } = ctx;
  return `  <div id="lock-screen" class="lock-screen">
    <i class="fa-solid fa-lock" style="font-size:28px;color:#22d3ee;"></i>
    <h1 style="font-family:'Outfit',sans-serif;font-size:20px;">Contenido Protegido</h1>
    <p style="font-size:13px;color:#94a3b8;">Esta publicación requiere contraseña para mostrarse.</p>
    <button type="button" id="unlock-btn" class="lock-btn">Introducir contraseña</button>
  </div>

  <div id="viewer-root" class="viewer-root">
    <div class="viewer-overlay" aria-hidden="true"></div>

    ${
      resolvedLogoSrc
        ? `<a href="${escapeHtml(brandUrl)}" target="_blank" rel="noopener noreferrer" class="brand-logo-float" title="${escapeHtml(brandUrl)}">
             <img src="${escapeHtml(resolvedLogoSrc)}" alt="Logo corporativo" />
           </a>`
        : ''
    }

    <div id="stage-viewport" class="stage-viewport">
      <button id="side-prev" type="button" class="nav-circle nav-prev" aria-label="Página anterior">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <div id="zoom-wrap" class="zoom-wrap">
        <div id="book-stage" class="w-full h-full" style="width:100%;height:100%;position:relative;"></div>
        <div id="spine-shadow" class="spine-shadow" style="display:none;"></div>
      </div>
      <button id="side-next" type="button" class="nav-circle nav-next" aria-label="Página siguiente">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>

    <div id="thumb-strip" class="thumb-strip"></div>

    <div class="controls-bar">
      <div id="reading-progress" class="reading-progress" aria-hidden="true"></div>
      <button id="first-btn" type="button" class="ctrl-btn" aria-label="Portada"><i class="fa-solid fa-backward-step"></i></button>
      <button id="prev-btn" type="button" class="ctrl-btn" aria-label="Anterior"><i class="fa-solid fa-chevron-left"></i></button>
      <span id="page-counter" class="page-counter"></span>
      <button id="next-btn" type="button" class="ctrl-btn" aria-label="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>
      <button id="last-btn" type="button" class="ctrl-btn" aria-label="Contraportada"><i class="fa-solid fa-forward-step"></i></button>
      <div class="ctrl-divider"></div>
      <button id="reading-btn" type="button" class="ctrl-btn" aria-label="Modo Lectura" title="Iniciar o pausar Modo Lectura">
        <i id="reading-icon" class="fa-solid ${config.autoplay ? 'fa-pause' : 'fa-play'}"></i>
        <span>Lectura</span>
      </button>
      <div class="reading-stepper" role="group" aria-label="Segundos Modo Lectura">
        <button id="reading-dec" type="button" class="reading-step-btn" aria-label="Menos segundos"><i class="fa-solid fa-minus"></i></button>
        <span id="reading-sec" class="reading-sec-val">${Math.max(1, Math.round(config.autoplayIntervalMs / 1000))}s</span>
        <button id="reading-inc" type="button" class="reading-step-btn" aria-label="Más segundos"><i class="fa-solid fa-plus"></i></button>
      </div>
      <div class="ctrl-divider"></div>
      <button id="thumb-btn" type="button" class="ctrl-btn" aria-label="Miniaturas"><i class="fa-solid fa-table-cells"></i></button>
      <button id="sound-btn" type="button" class="ctrl-btn" aria-label="Sonido"><i id="sound-icon" class="fa-solid ${config.soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}"></i></button>
      ${
        config.zoomEnabled
          ? `<div class="ctrl-divider"></div>
             <button id="zoom-out" type="button" class="ctrl-btn" aria-label="Alejar"><i class="fa-solid fa-minus"></i></button>
             <button id="zoom-reset" type="button" class="ctrl-btn page-counter">${config.zoomLevel}%</button>
             <button id="zoom-in" type="button" class="ctrl-btn" aria-label="Acercar"><i class="fa-solid fa-plus"></i></button>`
          : ''
      }
      <div class="ctrl-divider"></div>
      <button id="fs-btn" type="button" class="ctrl-btn" aria-label="Pantalla completa" title="Pantalla completa">
        <i id="fs-icon" class="fa-solid fa-expand"></i>
      </button>
    </div>
  </div>

`;
}
