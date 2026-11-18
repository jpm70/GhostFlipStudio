import type { BookConfig, FlipbookPage, HotspotItem } from '../../types/flipbook';
import { DEFAULT_LOGO } from '../../utils/assets';

export interface PendingHotspotRect {
  page: number;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function normalizeHotspotUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function syncPageHotspotLinks(
  pageEl: HTMLDivElement,
  pageIndex: number,
  hotspots: HotspotItem[],
  isLinkEditMode: boolean,
): void {
  pageEl.querySelectorAll('.gf-hotspot-link').forEach((node) => node.remove());
  if (isLinkEditMode) return;

  const pageHotspots = hotspots.filter(
    (h) => h.pageIndex === pageIndex || h.page === pageIndex + 1,
  );
  for (const h of pageHotspots) {
    const anchor = document.createElement('a');
    anchor.href = h.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.className = 'gf-hotspot-link';
    anchor.title = h.url;
    anchor.setAttribute('aria-label', `Enlace a ${h.url}`);
    anchor.style.position = 'absolute';
    anchor.style.left = `${h.x}%`;
    anchor.style.top = `${h.y}%`;
    anchor.style.width = `${h.width}%`;
    anchor.style.height = `${h.height}%`;
    anchor.style.opacity = '0';
    anchor.style.cursor = 'pointer';
    anchor.style.zIndex = '25';
    anchor.style.display = 'block';

    const stopBubble = (ev: Event) => {
      ev.stopPropagation();
    };
    anchor.addEventListener('mousedown', stopBubble);
    anchor.addEventListener('pointerdown', stopBubble);
    anchor.addEventListener('touchstart', stopBubble, { passive: true });
    anchor.addEventListener('click', stopBubble);

    pageEl.appendChild(anchor);
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function syncLazyPageImages(pageElements: HTMLDivElement[], currentIdx: number): void {
  const minIdx = Math.max(0, currentIdx - 1);
  const maxIdx = Math.min(pageElements.length - 1, currentIdx + 2);
  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    const target = el.dataset.bgSrc ? el : (el.querySelector<HTMLElement>('.page-content') ?? el);
    const bgSrc = target.dataset.bgSrc;
    if (!bgSrc) continue;
    if (i >= minIdx && i <= maxIdx) {
      if (target.dataset.bgLoaded !== '1') {
        target.style.backgroundImage = `url("${bgSrc}")`;
        target.dataset.bgLoaded = '1';
      }
    } else if (target.dataset.bgLoaded === '1') {
      target.style.backgroundImage = 'none';
      target.dataset.bgLoaded = '0';
    }
  }
}

export function createPageNumberOverlay(index: number, total: number): HTMLSpanElement {
  const isRightSidePage = index % 2 === 0;
  const badge = document.createElement('span');
  badge.className = 'gf-page-number';
  badge.setAttribute('aria-hidden', 'true');
  badge.textContent = `${index + 1} / ${total}`;
  badge.style.position = 'absolute';
  badge.style.bottom = '10px';
  if (isRightSidePage) {
    badge.style.right = '12px';
  } else {
    badge.style.left = '12px';
  }
  badge.style.zIndex = '20';
  badge.style.pointerEvents = 'none';
  badge.style.userSelect = 'none';
  badge.style.padding = '2px 8px';
  badge.style.borderRadius = '6px';
  badge.style.backgroundColor = 'rgba(2, 6, 23, 0.72)';
  badge.style.border = '1px solid rgba(51, 65, 85, 0.75)';
  badge.style.backdropFilter = 'blur(4px)';
  badge.style.fontFamily = 'var(--font-mono, "JetBrains Mono", monospace)';
  badge.style.fontSize = '11px';
  badge.style.fontWeight = '600';
  badge.style.lineHeight = '1.4';
  badge.style.color = '#e2e8f0';
  badge.style.letterSpacing = '0.03em';
  badge.style.boxShadow = '0 2px 8px rgba(2, 6, 23, 0.45)';
  return badge;
}

export function buildPageElement(
  page: FlipbookPage,
  index: number,
  total: number,
  config: BookConfig,
  hasUploadedDoc: boolean,
): HTMLDivElement {
  const pageDiv = document.createElement('div');
  const isHard =
    config.coverType === 'hard' && (index === 0 || index === total - 1);

  pageDiv.setAttribute('data-density', isHard ? 'hard' : 'soft');
  pageDiv.className = 'page my-page relative';
  pageDiv.style.backgroundColor = '#0f172a';
  pageDiv.style.backgroundSize = 'contain';
  pageDiv.style.backgroundPosition = 'center';
  pageDiv.style.backgroundRepeat = 'no-repeat';
  pageDiv.style.border = isHard
    ? '2px solid rgba(100, 116, 139, 0.75)'
    : '1px solid rgba(51, 65, 85, 0.8)';

  const pageNumberOverlay = createPageNumberOverlay(index, total);

  // Eliminate any residual test HTML whenever uploadedDoc is non-null or imageDataUrl is provided
  if (hasUploadedDoc || page.imageDataUrl) {
    if (page.imageDataUrl) {
      // La imagen va en un hijo: StPageFlip reescribe style.cssText del elemento de página
      // en cada fotograma y borraría el fondo si estuviera en pageDiv.
      const imgLayer = document.createElement('div');
      imgLayer.className = 'page-content';
      imgLayer.style.cssText =
        'position:absolute;inset:0;pointer-events:none;background-color:#0f172a;' +
        'background-size:contain;background-position:center;background-repeat:no-repeat;';
      imgLayer.dataset.bgSrc = page.imageDataUrl;
      imgLayer.dataset.bgLoaded = '0';
      pageDiv.appendChild(imgLayer);
    }
    pageDiv.appendChild(pageNumberOverlay);
    return pageDiv;
  }

  const contentDiv = document.createElement('div');
  contentDiv.className =
    'page-content w-full h-full overflow-hidden p-7 sm:p-8 pb-11 sm:pb-12 flex flex-col justify-between text-slate-100 pointer-events-none';
  contentDiv.style.backgroundColor = '#0f172a';
  contentDiv.innerHTML = `
    <div class="flex items-center justify-between gap-2 text-xs font-mono text-cyan-400">
      <span>${escapeHtml(page.label)}</span>
    </div>
    <div class="my-auto space-y-3">
      ${
        page.isCover
          ? `<div class="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 p-2 flex items-center justify-center">
               <img src="${DEFAULT_LOGO}" alt="GhostFlip Logo" class="w-full h-full object-contain" />
             </div>`
          : ''
      }
      <h2 class="font-display text-xl sm:text-2xl font-bold text-cyan-400 leading-tight">${escapeHtml(page.title)}</h2>
      ${page.subtitle ? `<p class="text-xs sm:text-sm text-emerald-300/90 font-medium">${escapeHtml(page.subtitle)}</p>` : ''}
      <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">${escapeHtml(page.body)}</p>
    </div>
    <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
      <span>GhostFlip Studio</span>
      <span>${isHard ? 'TAPA DURA' : 'MUESTRA'}</span>
    </div>
  `;

  pageDiv.appendChild(contentDiv);
  pageDiv.appendChild(pageNumberOverlay);
  return pageDiv;
}
