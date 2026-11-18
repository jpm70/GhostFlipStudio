import type { BookConfig, FlipbookPage, HotspotItem, UploadedDocument } from '../types/flipbook';
import { PAGE_FLIP_AUDIO_BASE64 } from './sound';
import pageFlipSource from 'page-flip/dist/js/page-flip.browser.js?raw';
import { buildIconCss } from './icons';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Hash de contraseña en cliente: SHA-256 iterado con sal aleatoria. Función AUTOCONTENIDA
 * (sin referencias externas) para poder serializarla con toString() dentro del HTML exportado
 * y que funcione también sin HTTPS (no usa crypto.subtle). Es una barrera ligera: el HTML
 * exportado contiene las páginas, así que no sustituye a un control de acceso en servidor.
 */
function ghostflipHash(password: string, salt: string, iterations: number): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  function sha256(data: number[]): number[] {
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const bytes = data.slice();
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
    const w: number[] = new Array(64);
    for (let off = 0; off < bytes.length; off += 64) {
      for (let i = 0; i < 16; i++) {
        w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
      }
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15], b = w[i - 2];
        const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    const out: number[] = [];
    for (let i = 0; i < 8; i++) out.push((h[i] >>> 24) & 255, (h[i] >>> 16) & 255, (h[i] >>> 8) & 255, h[i] & 255);
    return out;
  }
  const utf8 = Array.from(new TextEncoder().encode(salt + '::' + password));
  let digest = sha256(utf8);
  for (let i = 1; i < iterations; i++) digest = sha256(digest.concat(utf8));
  return digest.map((b) => (b < 16 ? '0' : '') + b.toString(16)).join('');
}

const PASSWORD_ITERATIONS = 20000;

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function extensionFromMime(mime: string, fallback = 'jpg'): string {
  const clean = mime.toLowerCase().split(';')[0].trim();
  switch (clean) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'audio/mpeg':
      return 'mp3';
    default:
      return fallback;
  }
}

export function dataUrlToBlob(
  dataUrl: string,
  fallbackExt = 'jpg',
): { blob: Blob; ext: string } | null {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;

  const mime = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || '';

  let bytes: Uint8Array;
  if (isBase64) {
    const binaryStr = window.atob(payload);
    bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
  } else {
    const decoded = decodeURIComponent(payload);
    bytes = new TextEncoder().encode(decoded);
  }

  return {
    blob: new Blob([bytes.buffer as ArrayBuffer], { type: mime }),
    ext: extensionFromMime(mime, fallbackExt),
  };
}

async function resolveSourceToBlob(
  src: string,
  fallbackExt = 'png',
): Promise<{ blob: Blob; ext: string } | null> {
  if (!src) return null;
  if (src.startsWith('data:')) {
    return dataUrlToBlob(src, fallbackExt);
  }
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const urlExt = src.split('?')[0].split('.').pop()?.toLowerCase();
    const ext = extensionFromMime(blob.type || '', urlExt || fallbackExt);
    return { blob, ext };
  } catch {
    return null;
  }
}

export interface GenerateHtmlOptions {
  serializedPagesOverride?: (string | FlipbookPage)[];
  logoPath?: string;
  audioUri?: string;
  bgImagePath?: string | null;
  /** Ruta relativa del motor page-flip (ZIP). Si falta, se incrusta en el propio HTML. */
  pageFlipPath?: string;
}

export function generateStaticFlipbookHtml(
  config: BookConfig,
  pages: FlipbookPage[],
  doc: UploadedDocument | null,
  hotspots: HotspotItem[] = [],
  options: GenerateHtmlOptions = {},
): string {
  const fallbackTitle = doc ? doc.name.replace(/\.[^/.]+$/, '') : 'Mi Revista Interactiva 3D';
  const seoTitle = config.seoTitle.trim() || fallbackTitle;
  const seoDescription =
    config.seoDescription.trim() ||
    'Publicación digital interactiva en 3D generada con GhostFlip Studio.';
  const seoKeywords = config.seoKeywords.trim() || 'flipbook, revista digital, ghostflip';

  const hasPassword = config.passwordProtected && config.passwordValue.trim().length > 0;
  const passwordSalt = hasPassword ? randomSalt() : '';
  const passwordHash = hasPassword ? ghostflipHash(config.passwordValue, passwordSalt, PASSWORD_ITERATIONS) : '';

  const rawBrandUrl = config.brandUrl.trim();
  const brandUrl = /^https?:\/\//i.test(rawBrandUrl) ? rawBrandUrl : 'https://www.unfantasmaenelsistema.com/';
  const brandLogoPosStyle =
    config.brandLogoPosition === 'top-right' ? 'right: 16px;' : 'left: 16px;';

  const resolvedLogoSrc = options.logoPath !== undefined ? options.logoPath : config.brandLogo;
  const resolvedAudioUri = options.audioUri ?? PAGE_FLIP_AUDIO_BASE64;
  const resolvedBgImage =
    options.bgImagePath !== undefined ? options.bgImagePath : config.bgImage;

  const pagesPayload = options.serializedPagesOverride ?? pages;
  const serializedPages = JSON.stringify(pagesPayload).replace(/</g, '\\u003c');
  const serializedHotspots = JSON.stringify(hotspots).replace(/</g, '\\u003c');
  const serializedConfig = JSON.stringify({
    width: config.width,
    height: config.height,
    coverType: config.coverType,
    flippingTime: config.flippingTime,
    bgColor: config.bgColor,
    bgImage: resolvedBgImage,
    bgOverlayOpacity: config.bgOverlayOpacity,
    dynamicShadows: config.dynamicShadows,
    shadowIntensity: config.shadowIntensity,
    soundEnabled: config.soundEnabled,
    autoplay: config.autoplay,
    autoplayIntervalMs: config.autoplayIntervalMs,
    zoomEnabled: config.zoomEnabled,
    zoomLevel: config.zoomLevel,
  }).replace(/</g, '\\u003c');

  const safeAudioUri = JSON.stringify(resolvedAudioUri);
  const pageFlipScriptTag = options.pageFlipPath
    ? `<script src="${escapeHtml(options.pageFlipPath)}"></script>`
    : `<script>${pageFlipSource.replace(/<\/script/gi, '<\\/script')}</script>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDescription)}" />
  <meta name="keywords" content="${escapeHtml(seoKeywords)}" />
  <meta property="og:title" content="${escapeHtml(seoTitle)}" />
  <meta property="og:description" content="${escapeHtml(seoDescription)}" />
  <meta property="og:type" content="website" />
  <style>${buildIconCss()}</style>
  ${pageFlipScriptTag}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Outfit:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
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
  </style>
</head>
<body>
  ${
    hasPassword
      ? `<script>
    (function() {
      var expectedHash = ${JSON.stringify(passwordHash)};
      ${ghostflipHash.toString().replace(/<\/script/gi, '<\\/script')}
      var SALT = ${JSON.stringify(passwordSalt)};
      var ITER = ${PASSWORD_ITERATIONS};
      var hashInput = function (pw) { return ghostflipHash(pw, SALT, ITER); };
      window.__ghostflipCheckAccess = function() {
        var attempt = window.prompt('Introduce la contraseña:');
        if (attempt !== null && hashInput(attempt) === expectedHash) {
          window.__ghostflipUnlocked = true;
          var root = document.getElementById('viewer-root');
          var lock = document.getElementById('lock-screen');
          if (root) root.style.display = 'flex';
          if (lock) lock.style.display = 'none';
          return true;
        }
        return false;
      };
      window.__ghostflipUnlocked = false;
      var firstAttempt = window.prompt('Introduce la contraseña:');
      if (firstAttempt !== null && hashInput(firstAttempt) === expectedHash) {
        window.__ghostflipUnlocked = true;
      }
    })();
  <\/script>`
      : ''
  }

  <div id="lock-screen" class="lock-screen">
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

  <script>
    const viewerRootEl = document.getElementById('viewer-root');
    const lockScreenEl = document.getElementById('lock-screen');
    if (window.__ghostflipUnlocked === true) {
      viewerRootEl.style.display = 'flex';
      if (lockScreenEl) lockScreenEl.style.display = 'none';
    }
    const unlockBtn = document.getElementById('unlock-btn');
    if (unlockBtn && window.__ghostflipCheckAccess) {
      unlockBtn.addEventListener('click', function() {
        if (window.__ghostflipCheckAccess()) {
          resizeFlipbook();
          if (typeof scheduleReadingMode === 'function') scheduleReadingMode();
        }
      });
    }

    const PAGES = ${serializedPages};
    const HOTSPOTS = ${serializedHotspots};
    const CONFIG = ${serializedConfig};
    const AUDIO_URI = ${safeAudioUri};

    let soundActive = Boolean(CONFIG.soundEnabled);
    let currentZoom = CONFIG.zoomEnabled ? (CONFIG.zoomLevel || 100) : 100;
    let fitScale = 1;
    let panX = 0, panY = 0, panning = false, startX = 0, startY = 0;

    const flipAudio = AUDIO_URI ? new Audio(AUDIO_URI) : null;
    if (flipAudio) flipAudio.volume = 0.45;
    function playFlipSound() {
      if (!soundActive || !flipAudio) return;
      flipAudio.currentTime = 0;
      flipAudio.play().catch(() => {});
    }

    const viewport = document.getElementById('stage-viewport');
    const stage = document.getElementById('book-stage');
    const zoomWrap = document.getElementById('zoom-wrap');
    const spine = document.getElementById('spine-shadow');
    const counter = document.getElementById('page-counter');
    const thumbStrip = document.getElementById('thumb-strip');

    const singleW = Math.max(200, Math.round(CONFIG.width / 2));
    const totalW = singleW * 2;
    const pageH = Math.max(290, CONFIG.height);

    function applyTransform() {
      if (currentZoom <= 100) { panX = 0; panY = 0; }
      const scale = currentZoom / 100;
      zoomWrap.style.transform = (currentZoom !== 100)
        ? 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')'
        : 'none';
      viewport.classList.toggle('pan-ready', currentZoom > 100);
      stage.style.pointerEvents = currentZoom > 100 ? 'none' : 'auto';
      const resetEl = document.getElementById('zoom-reset');
      if (resetEl) resetEl.textContent = currentZoom + '%';
    }

    function resizeFlipbook() {
      const rect = viewport.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const maxAvailW = Math.max(240, rect.width * 0.9 - 104);
      const maxAvailH = Math.max(200, rect.height * 0.9);
      const ratio = Math.min(1, maxAvailW / totalW, maxAvailH / pageH);
      zoomWrap.style.width = Math.max(400, Math.round(totalW * ratio)) + 'px';
      zoomWrap.style.height = Math.max(290, Math.round(pageH * ratio)) + 'px';
      zoomWrap.style.aspectRatio = totalW + ' / ' + pageH;
      applyTransform();
    }
    new ResizeObserver(() => {
      resizeFlipbook();
      window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }).observe(viewport);
    window.addEventListener('resize', resizeFlipbook);

    viewport.addEventListener('mousedown', (e) => {
      if (currentZoom <= 100 || e.target.closest('button')) return;
      panning = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      viewport.classList.add('pan-active');
      zoomWrap.style.transition = 'none';
    });
    window.addEventListener('mousemove', (e) => {
      if (!panning) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      applyTransform();
    });
    window.addEventListener('mouseup', () => {
      if (!panning) return;
      panning = false;
      viewport.classList.remove('pan-active');
      zoomWrap.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    });

    resizeFlipbook();

    const bookEl = document.createElement('div');
    bookEl.style.width = '100%';
    bookEl.style.height = '100%';

    const pageEls = PAGES.map((page, idx) => {
      const div = document.createElement('div');
      const isHard = CONFIG.coverType === 'hard' && (idx === 0 || idx === PAGES.length - 1);
      div.setAttribute('data-density', isHard ? 'hard' : 'soft');
      div.className = 'page my-page';
      div.style.border = isHard ? '2px solid rgba(100,116,139,0.75)' : '1px solid rgba(51,65,85,0.8)';

      const content = document.createElement('div');
      content.className = 'page-content';
      const imgSrc = typeof page === 'string' ? page : page.imageDataUrl;
      if (imgSrc) {
        content.dataset.bgSrc = imgSrc;
        content.dataset.bgLoaded = '0';
        content.style.backgroundSize = 'contain';
        content.style.backgroundPosition = 'center';
        content.style.backgroundRepeat = 'no-repeat';
      } else {
        content.innerHTML =
          '<div class="gf-editorial" style="padding-bottom:44px;"><div class="gf-label">' + (page.label || ('PÁGINA ' + (idx + 1))) + '</div>' +
          '<div><h2 class="gf-title">' + (page.title || '') + '</h2><p class="gf-body">' + (page.body || '') + '</p></div>' +
          '<div class="gf-foot"><span>GhostFlip</span><span>' + (isHard ? 'TAPA DURA' : 'MUESTRA') + '</span></div></div>';
      }
      div.appendChild(content);

      const numBadge = document.createElement('span');
      numBadge.setAttribute('aria-hidden', 'true');
      numBadge.textContent = (idx + 1) + ' / ' + PAGES.length;
      numBadge.style.cssText = 'position:absolute;bottom:10px;' + (idx % 2 === 0 ? 'right:12px;' : 'left:12px;') +
        'z-index:20;pointer-events:none;user-select:none;padding:2px 8px;border-radius:6px;' +
        'background:rgba(2,6,23,0.72);border:1px solid rgba(51,65,85,0.75);backdrop-filter:blur(4px);' +
        'font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:600;color:#e2e8f0;';
      div.appendChild(numBadge);

      HOTSPOTS.filter((h) => h.pageIndex === idx || h.page === idx + 1).forEach((h) => {
        const a = document.createElement('a');
        a.href = h.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = h.url;
        a.setAttribute('aria-label', 'Enlace a ' + h.url);
        a.style.position = 'absolute';
        a.style.left = h.x + '%';
        a.style.top = h.y + '%';
        a.style.width = h.width + '%';
        a.style.height = h.height + '%';
        a.style.opacity = '0';
        a.style.cursor = 'pointer';
        a.style.zIndex = '25';
        a.style.display = 'block';
        const stop = (ev) => ev.stopPropagation();
        a.addEventListener('mousedown', stop);
        a.addEventListener('pointerdown', stop);
        a.addEventListener('touchstart', stop, { passive: true });
        a.addEventListener('click', stop);
        div.appendChild(a);
      });

      bookEl.appendChild(div);
      return div;
    });
    stage.appendChild(bookEl);

    function syncLazyPages(currentIdx) {
      const min = Math.max(0, currentIdx - 1);
      const max = Math.min(pageEls.length - 1, currentIdx + 2);
      for (let i = 0; i < pageEls.length; i++) {
        const target = pageEls[i].querySelector('.page-content') || pageEls[i];
        const src = target.dataset.bgSrc;
        if (!src) continue;
        if (i >= min && i <= max) {
          if (target.dataset.bgLoaded !== '1') {
            target.style.backgroundImage = 'url("' + src + '")';
            target.dataset.bgLoaded = '1';
          }
        } else if (target.dataset.bgLoaded === '1') {
          target.style.backgroundImage = 'none';
          target.dataset.bgLoaded = '0';
        }
      }
    }

    const pageFlip = new window.St.PageFlip(bookEl, {
      width: singleW, height: pageH, size: 'stretch',
      minWidth: 200, maxWidth: singleW, minHeight: Math.min(290, pageH), maxHeight: pageH,
      flippingTime: CONFIG.flippingTime || 700,
      drawShadow: Boolean(CONFIG.dynamicShadows),
      maxShadowOpacity: CONFIG.dynamicShadows ? Math.min(0.8, (CONFIG.shadowIntensity || 70) / 100) : 0,
      usePortrait: false, autoSize: true, showCover: true, mobileScrollSupport: false, useMouseEvents: true
    });
    pageFlip.loadFromHTML(pageEls);

    let readingActive = Boolean(CONFIG.autoplay);
    let readingSeconds = Math.max(1, Math.round((CONFIG.autoplayIntervalMs || 5000) / 1000));
    let readingTimer = null;
    const readingBtn = document.getElementById('reading-btn');
    const readingIcon = document.getElementById('reading-icon');
    const readingSecEl = document.getElementById('reading-sec');
    const readingProgressEl = document.getElementById('reading-progress');

    function updateReadingUi() {
      if (readingBtn) readingBtn.classList.toggle('reading-active', readingActive);
      if (readingIcon) readingIcon.className = 'fa-solid ' + (readingActive ? 'fa-pause' : 'fa-play');
      if (readingSecEl) readingSecEl.textContent = readingSeconds + 's';
    }

    function scheduleReadingMode() {
      if (readingTimer) {
        clearTimeout(readingTimer);
        readingTimer = null;
      }
      updateReadingUi();
      if (readingProgressEl) {
        readingProgressEl.style.animation = 'none';
        readingProgressEl.style.display = 'none';
      }
      if (!readingActive || PAGES.length <= 1 || window.__ghostflipUnlocked === false) return;

      if (readingProgressEl) {
        void readingProgressEl.offsetWidth;
        readingProgressEl.style.display = 'block';
        readingProgressEl.style.animation = 'readingFill ' + (readingSeconds * 1000) + 'ms linear forwards';
      }

      readingTimer = setTimeout(() => {
        if (pageFlip.getCurrentPageIndex() >= PAGES.length - 1) {
          pageFlip.turnToPage(0);
          syncState(0);
          playFlipSound();
        } else {
          pageFlip.flipNext('top');
        }
      }, readingSeconds * 1000);
    }

    function syncState(idx) {
      counter.textContent = (idx + 1) + ' / ' + PAGES.length;
      spine.style.display = (CONFIG.dynamicShadows && idx > 0 && idx < PAGES.length - 1) ? 'block' : 'none';
      thumbStrip.querySelectorAll('.thumb-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
      syncLazyPages(idx);
      scheduleReadingMode();
    }
    syncState(0);

    PAGES.forEach((p, idx) => {
      const imgSrc = typeof p === 'string' ? p : p.imageDataUrl;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb-btn' + (idx === 0 ? ' active' : '');
      btn.innerHTML = (imgSrc ? '<img src="' + imgSrc + '" loading="lazy" alt="Pág ' + (idx + 1) + '" />' : '<span>' + (p.title || ('P.' + (idx + 1))) + '</span>') +
        '<span class="thumb-num">' + String(idx + 1).padStart(2, '0') + '</span>';
      btn.addEventListener('click', () => pageFlip.flip(idx, 'top'));
      thumbStrip.appendChild(btn);
    });

    pageFlip.on('flip', (e) => { syncState(e.data); playFlipSound(); });

    const goPrev = () => pageFlip.flipPrev('top');
    const goNext = () => pageFlip.flipNext('top');
    document.getElementById('prev-btn').addEventListener('click', goPrev);
    document.getElementById('side-prev').addEventListener('click', goPrev);
    document.getElementById('next-btn').addEventListener('click', goNext);
    document.getElementById('side-next').addEventListener('click', goNext);
    document.getElementById('first-btn').addEventListener('click', () => { pageFlip.turnToPage(0); syncState(0); });
    document.getElementById('last-btn').addEventListener('click', () => { pageFlip.turnToPage(PAGES.length - 1); syncState(PAGES.length - 1); });
    document.getElementById('thumb-btn').addEventListener('click', () => { thumbStrip.classList.toggle('open'); resizeFlipbook(); });
    document.getElementById('sound-btn').addEventListener('click', () => {
      soundActive = !soundActive;
      document.getElementById('sound-icon').className = 'fa-solid ' + (soundActive ? 'fa-volume-high' : 'fa-volume-xmark');
    });

    if (readingBtn) {
      readingBtn.addEventListener('click', () => {
        readingActive = !readingActive;
        scheduleReadingMode();
      });
    }
    const decBtn = document.getElementById('reading-dec');
    const incBtn = document.getElementById('reading-inc');
    if (decBtn) {
      decBtn.addEventListener('click', () => {
        readingSeconds = Math.max(1, readingSeconds - 1);
        scheduleReadingMode();
      });
    }
    if (incBtn) {
      incBtn.addEventListener('click', () => {
        readingSeconds = Math.min(60, readingSeconds + 1);
        scheduleReadingMode();
      });
    }

    const fsBtn = document.getElementById('fs-btn');
    const fsIcon = document.getElementById('fs-icon');
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (viewerRootEl.requestFullscreen) {
        viewerRootEl.requestFullscreen().catch(() => {});
      }
    });
    document.addEventListener('fullscreenchange', () => {
      fsIcon.className = 'fa-solid ' + (document.fullscreenElement ? 'fa-compress' : 'fa-expand');
    });

    const zoomOut = document.getElementById('zoom-out');
    const zoomIn = document.getElementById('zoom-in');
    const zoomReset = document.getElementById('zoom-reset');
    if (zoomOut) zoomOut.addEventListener('click', () => { currentZoom = Math.max(60, currentZoom - 10); applyTransform(); });
    if (zoomIn) zoomIn.addEventListener('click', () => { currentZoom = Math.min(150, currentZoom + 10); applyTransform(); });
    if (zoomReset) zoomReset.addEventListener('click', () => { currentZoom = 100; applyTransform(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Home') { pageFlip.turnToPage(0); syncState(0); }
      if (e.key === 'End') { pageFlip.turnToPage(PAGES.length - 1); syncState(PAGES.length - 1); }
      if ((e.key === 'r' || e.key === 'R') && readingBtn) readingBtn.click();
      if ((e.key === 'f' || e.key === 'F') && fsBtn) fsBtn.click();
    });

    resizeFlipbook();
  </script>
</body>
</html>`;
}

function triggerDownloadBlob(blob: Blob, filename: string): void {
  if (typeof window.saveAs === 'function') {
    window.saveAs(blob, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ZipExportResult {
  bytes: number;
  pageImagesCount: number;
  hasLogoAsset: boolean;
  hasAudioAsset: boolean;
}

export async function exportFlipbookZip(
  config: BookConfig,
  pages: FlipbookPage[],
  doc: UploadedDocument | null,
  hotspots: HotspotItem[] = [],
  filename = 'revista_interactiva.zip',
): Promise<ZipExportResult> {
  const JSZipCtor = window.JSZip;
  if (!JSZipCtor) {
    throw new Error('La librería JSZip no está disponible. Recarga la página.');
  }

  const zip = new JSZipCtor();
  const assetsFolder = zip.folder('assets');
  const pagesFolder = assetsFolder?.folder('pages');

  const globalImages = Array.isArray(window.flipbookPages) ? window.flipbookPages : [];
  const relativePages: (string | FlipbookPage)[] = [];
  let pageImagesCount = 0;

  // Convert each Base64 page image to a real Blob under assets/pages/
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const sourceDataUrl = page.imageDataUrl || globalImages[i];
    if (sourceDataUrl && pagesFolder) {
      const parsed = dataUrlToBlob(sourceDataUrl, 'jpg');
      if (parsed) {
        const pageFileName = `page-${i + 1}.${parsed.ext}`;
        pagesFolder.file(pageFileName, parsed.blob);
        relativePages.push(`assets/pages/${pageFileName}`);
        pageImagesCount++;
        continue;
      }
    }
    relativePages.push(page);
  }

  // Pack corporate logo inside assets/
  let logoPath = '';
  let hasLogoAsset = false;
  if (config.brandLogo && assetsFolder) {
    const logoAsset = await resolveSourceToBlob(config.brandLogo, 'png');
    if (logoAsset) {
      const logoFileName = `logo.${logoAsset.ext}`;
      assetsFolder.file(logoFileName, logoAsset.blob);
      logoPath = `assets/${logoFileName}`;
      hasLogoAsset = true;
    }
  }

  // Pack custom background image inside assets/ if present
  let bgImagePath: string | null = config.bgImage;
  if (config.bgImage && assetsFolder) {
    const bgAsset = await resolveSourceToBlob(config.bgImage, 'jpg');
    if (bgAsset) {
      const bgFileName = `background.${bgAsset.ext}`;
      assetsFolder.file(bgFileName, bgAsset.blob);
      bgImagePath = `assets/${bgFileName}`;
    }
  }

  // Pack page-flip audio inside assets/
  let audioPath = '';
  let hasAudioAsset = false;
  if (assetsFolder) {
    const audioAsset = dataUrlToBlob(PAGE_FLIP_AUDIO_BASE64, 'wav');
    if (audioAsset) {
      assetsFolder.file('page-flip.wav', audioAsset.blob);
      audioPath = 'assets/page-flip.wav';
      hasAudioAsset = true;
    }
  }

  if (assetsFolder) assetsFolder.file('page-flip.min.js', pageFlipSource);

  const indexHtml = generateStaticFlipbookHtml(config, pages, doc, hotspots, {
    pageFlipPath: assetsFolder ? 'assets/page-flip.min.js' : undefined,
    serializedPagesOverride: relativePages,
    logoPath,
    audioUri: audioPath || PAGE_FLIP_AUDIO_BASE64,
    bgImagePath,
  });

  zip.file('index.html', indexHtml);

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  triggerDownloadBlob(zipBlob, filename);

  return {
    bytes: zipBlob.size,
    pageImagesCount,
    hasLogoAsset,
    hasAudioAsset,
  };
}

export async function exportStandaloneFlipbook(
  config: BookConfig,
  pages: FlipbookPage[],
  doc: UploadedDocument | null,
  filename = 'mi_revista_interactiva.html',
  hotspots: HotspotItem[] = [],
): Promise<number> {
  const logoAsset = await resolveSourceToBlob(config.brandLogo, 'png');
  let inlinedLogo = config.brandLogo;
  if (logoAsset) {
    inlinedLogo = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : config.brandLogo);
      reader.onerror = () => resolve(config.brandLogo);
      reader.readAsDataURL(logoAsset.blob);
    });
  }

  const html = generateStaticFlipbookHtml(
    { ...config, brandLogo: inlinedLogo },
    pages,
    doc,
    hotspots,
  );
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerDownloadBlob(blob, filename);
  return blob.size;
}
