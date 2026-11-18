import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BookConfig,
  FlipbookPage,
  HotspotItem,
  ParseProgress,
  UploadedDocument,
} from '../types/flipbook';
import { playPageFlipSound } from '../utils/sound';
import { DEFAULT_LOGO } from '../utils/assets';

interface StPageFlipInstance {
  loadFromHTML: (items: HTMLElement[] | NodeListOf<HTMLElement>) => void;
  updateFromHtml?: (items: HTMLElement[] | NodeListOf<HTMLElement>) => void;
  flipNext: (corner?: 'top' | 'bottom') => void;
  flipPrev: (corner?: 'top' | 'bottom') => void;
  flip: (pageNum: number, corner?: 'top' | 'bottom') => void;
  turnToPage: (pageNum: number) => void;
  getCurrentPageIndex: () => number;
  getPageCount: () => number;
  on: (eventName: string, callback: (e: { data: number }) => void) => void;
  destroy: () => void;
}

interface StNamespace {
  PageFlip: new (
    htmlElement: HTMLElement,
    settings: {
      width: number;
      height: number;
      size?: 'fixed' | 'stretch';
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
      drawShadow?: boolean;
      flippingTime?: number;
      usePortrait?: boolean;
      startZIndex?: number;
      autoSize?: boolean;
      maxShadowOpacity?: number;
      showCover?: boolean;
      mobileScrollSupport?: boolean;
      swipeDistance?: number;
      clickEventForward?: boolean;
      useMouseEvents?: boolean;
      disableFlipByClick?: boolean;
    },
  ) => StPageFlipInstance;
}

declare global {
  interface Window {
    St?: StNamespace;
  }
}

interface FlipbookStageProps {
  config: BookConfig;
  pages: FlipbookPage[];
  uploadedDoc: UploadedDocument | null;
  hotspots: HotspotItem[];
  isLinkEditMode: boolean;
  onAddHotspot: (hotspot: HotspotItem) => void;
  onDeleteHotspot: (id: string) => void;
  parseProgress: ParseProgress | null;
  isPreviewMode: boolean;
  onExitPreview: () => void;
  onChangeZoom: (nextZoom: number) => void;
  onToggleReadingMode: () => void;
  onChangeReadingInterval: (intervalMs: number) => void;
}

interface PendingHotspotRect {
  page: number;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function normalizeHotspotUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function syncPageHotspotLinks(
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function syncLazyPageImages(pageElements: HTMLDivElement[], currentIdx: number): void {
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

function createPageNumberOverlay(index: number, total: number): HTMLSpanElement {
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

function buildPageElement(
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
      pageDiv.dataset.bgSrc = page.imageDataUrl;
      pageDiv.dataset.bgLoaded = '0';
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

export const FlipbookStage: React.FC<FlipbookStageProps> = ({
  config,
  pages,
  uploadedDoc,
  hotspots,
  isLinkEditMode,
  onAddHotspot,
  onDeleteHotspot,
  parseProgress,
  isPreviewMode,
  onExitPreview,
  onChangeZoom,
  onToggleReadingMode,
  onChangeReadingInterval,
}) => {
  const stageRootRef = useRef<HTMLDivElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const flipbookContainerRef = useRef<HTMLDivElement>(null);
  const stageHostRef = useRef<HTMLDivElement>(null);
  const hotspotCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageElementsRef = useRef<HTMLDivElement[]>([]);
  const pageFlipRef = useRef<StPageFlipInstance | null>(null);
  const soundEnabledRef = useRef(config.soundEnabled);
  const hotspotsRef = useRef<HotspotItem[]>(hotspots);
  const isLinkEditModeRef = useRef<boolean>(isLinkEditMode);
  const currentPageRef = useRef(0);
  const previousPagesRef = useRef<FlipbookPage[]>(pages);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [engineReady, setEngineReady] = useState(false);
  const [containerBoxSize, setContainerBoxSize] = useState<{ width: number; height: number } | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isEditingPageJump, setIsEditingPageJump] = useState(false);
  const [pageJumpInput, setPageJumpInput] = useState('1');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  const [pendingHotspot, setPendingHotspot] = useState<PendingHotspotRect | null>(null);
  const [hotspotUrlInput, setHotspotUrlInput] = useState('https://');
  const [visiblePageIndices, setVisiblePageIndices] = useState<number[]>([0]);
  const drawingStateRef = useRef<{
    active: boolean;
    pageIndex: number;
    pageRect: DOMRect;
    startClientX: number;
    startClientY: number;
    draftRect: PendingHotspotRect | null;
  } | null>(null);

  hotspotsRef.current = hotspots;
  isLinkEditModeRef.current = isLinkEditMode;

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (stageRootRef.current?.requestFullscreen) {
        await stageRootRef.current.requestFullscreen();
      }
    } catch {
      // Gracefully ignore if browser/iframe blocks fullscreen API
    }
  };

  soundEnabledRef.current = config.soundEnabled;

  const singleWidth = Math.max(200, Math.round(config.width / 2));
  const totalBookWidth = singleWidth * 2;
  const bookHeight = Math.max(290, config.height);

  // Measure available #canvas-wrapper space so #flipbook-container respects max-width:90%, max-height:90%, aspect-ratio
  // and lets StPageFlip's native size:"stretch" scale without any CSS transform on the parent!
  useEffect(() => {
    const wrapperEl = stageViewportRef.current;
    if (!wrapperEl) return;

    const updateContainerDimensions = () => {
      const rect = wrapperEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const sideReserve = window.innerWidth >= 640 ? 104 : 0;
      const maxAvailW = Math.max(200, rect.width * 0.9 - sideReserve);
      const maxAvailH = Math.max(200, rect.height * 0.9);
      const ratio = Math.min(1, maxAvailW / totalBookWidth, maxAvailH / bookHeight);
      const fittedW = Math.max(280, Math.round(totalBookWidth * ratio));
      const fittedH = Math.max(200, Math.round(bookHeight * ratio));
      setContainerBoxSize({ width: fittedW, height: fittedH });
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };

    updateContainerDimensions();
    const observer = new ResizeObserver(updateContainerDimensions);
    observer.observe(wrapperEl);
    window.addEventListener('resize', updateContainerDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateContainerDimensions);
    };
  }, [totalBookWidth, bookHeight, showThumbnails, isPreviewMode]);

  // Reset pan offset when zoom returns to <= 100%
  const isZoomPanActive = config.zoomEnabled && config.zoomLevel > 100;
  useEffect(() => {
    if (!isZoomPanActive) {
      setPanOffset({ x: 0, y: 0 });
      setIsPanning(false);
    }
  }, [isZoomPanActive]);

  // Transparent rebuildFlipbook() preserving active page index using native StPageFlip size: "stretch"
  const rebuildFlipbook = useCallback(() => {
    const host = stageHostRef.current;
    if (!host) return;

    const isNewDocument = previousPagesRef.current !== pages;
    const savedPageIndex = isNewDocument ? 0 : currentPageRef.current;
    previousPagesRef.current = pages;

    if (pageFlipRef.current) {
      try {
        pageFlipRef.current.destroy();
      } catch {
        // Ignore teardown issues
      }
      pageFlipRef.current = null;
    }

    host.innerHTML = '';

    const bookContainer = document.createElement('div');
    bookContainer.id = 'flipbook';
    bookContainer.style.width = '100%';
    bookContainer.style.height = '100%';

    const hasUploadedDoc = uploadedDoc !== null;
    const pageElements = pages.map((page, index) => {
      const el = buildPageElement(page, index, pages.length, config, hasUploadedDoc);
      syncPageHotspotLinks(el, index, hotspotsRef.current, isLinkEditModeRef.current);
      return el;
    });
    pageElementsRef.current = pageElements;
    pageElements.forEach((el) => bookContainer.appendChild(el));
    host.appendChild(bookContainer);

    const clampedPage = Math.max(0, Math.min(pages.length - 1, savedPageIndex));
    currentPageRef.current = clampedPage;
    setCurrentPageIndex(clampedPage);

    const PageFlipCtor = window.St?.PageFlip;
    if (!PageFlipCtor) {
      setEngineReady(false);
      return;
    }

    const singlePageWidth = Math.max(200, Math.round(config.width / 2));

    const pageFlip = new PageFlipCtor(bookContainer, {
      width: singlePageWidth,
      height: bookHeight,
      size: 'stretch',
      minWidth: 200,
      maxWidth: singlePageWidth,
      minHeight: Math.min(290, bookHeight),
      maxHeight: bookHeight,
      drawShadow: config.dynamicShadows,
      maxShadowOpacity: config.dynamicShadows
        ? Math.max(0.15, Math.min(0.8, config.shadowIntensity / 100))
        : 0,
      flippingTime: config.flippingTime,
      usePortrait: false,
      autoSize: true,
      showCover: true,
      mobileScrollSupport: false,
      useMouseEvents: true,
      swipeDistance: 30,
      clickEventForward: false,
      disableFlipByClick: false,
    });

    pageFlip.loadFromHTML(pageElements);
    if (clampedPage > 0) {
      pageFlip.turnToPage(clampedPage);
    }
    syncLazyPageImages(pageElements, clampedPage);

    pageFlip.on('flip', (e) => {
      const nextIdx = typeof e?.data === 'number' ? e.data : pageFlip.getCurrentPageIndex();
      currentPageRef.current = nextIdx;
      setCurrentPageIndex(nextIdx);
      syncLazyPageImages(pageElementsRef.current, nextIdx);
      if (soundEnabledRef.current) {
        playPageFlipSound();
      }
    });

    pageFlipRef.current = pageFlip;
    setEngineReady(true);
  }, [
    pages,
    uploadedDoc,
    singleWidth,
    totalBookWidth,
    bookHeight,
    config.coverType,
    config.flippingTime,
    config.dynamicShadows,
    config.shadowIntensity,
  ]);

  useEffect(() => {
    rebuildFlipbook();
    return () => {
      pageElementsRef.current = [];
      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch {
          // Ignore teardown errors
        }
        pageFlipRef.current = null;
      }
    };
  }, [rebuildFlipbook]);

  // Keep invisible <a> hotspot overlays synced on every page DOM node
  useEffect(() => {
    pageElementsRef.current.forEach((el, idx) => {
      syncPageHotspotLinks(el, idx, hotspots, isLinkEditMode);
    });
  }, [hotspots, isLinkEditMode, engineReady]);

  // Phase 9 Lazy Loading: keep only (n-1, n, n+1, n+2) background images mounted in RAM
  useEffect(() => {
    syncLazyPageImages(pageElementsRef.current, currentPageIndex);
  }, [currentPageIndex, engineReady]);

  // Draw existing hotspots + draft rectangle onto the edit <canvas>
  const drawHotspotCanvas = useCallback(
    (draft: PendingHotspotRect | null = null) => {
      const canvas = hotspotCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const canvasRect = canvas.getBoundingClientRect();
      if (!canvasRect.width || !canvasRect.height) return;
      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;

      const visibleMap = new Map<number, DOMRect>();
      pageElementsRef.current.forEach((el, idx) => {
        const r = el.getBoundingClientRect();
        if (r.width > 10 && r.height > 10) {
          visibleMap.set(idx, r);
        }
      });

      const drawBox = (
        pageRect: DOMRect,
        rectPct: { x: number; y: number; width: number; height: number },
        labelText?: string,
        isDraft = false,
      ) => {
        const px = (pageRect.left + (rectPct.x / 100) * pageRect.width - canvasRect.left) * scaleX;
        const py = (pageRect.top + (rectPct.y / 100) * pageRect.height - canvasRect.top) * scaleY;
        const pw = ((rectPct.width / 100) * pageRect.width) * scaleX;
        const ph = ((rectPct.height / 100) * pageRect.height) * scaleY;

        ctx.save();
        ctx.fillStyle = 'rgba(34, 211, 238, 0.30)';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = isDraft ? '#67e8f9' : '#22d3ee';
        ctx.lineWidth = 2;
        if (isDraft) {
          ctx.setLineDash([6, 4]);
        }
        ctx.strokeRect(px, py, pw, ph);

        if (labelText) {
          const shortLabel = labelText.replace(/^https?:\/\//i, '').slice(0, 26);
          ctx.font = '600 11px "JetBrains Mono", monospace';
          const textW = ctx.measureText(shortLabel).width;
          const badgeW = Math.min(Math.max(textW + 10, 40), Math.max(pw, 80));
          const badgeY = py >= 22 ? py - 20 : py + 4;
          ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
          ctx.fillRect(px, badgeY, badgeW, 18);
          ctx.fillStyle = '#67e8f9';
          ctx.fillText(shortLabel, px + 5, badgeY + 13, badgeW - 10);
        }
        ctx.restore();
      };

      for (const h of hotspots) {
        const pageRect = visibleMap.get(h.pageIndex);
        if (pageRect) {
          drawBox(pageRect, h, h.url, false);
        }
      }

      if (draft) {
        const draftPageRect = visibleMap.get(draft.pageIndex);
        if (draftPageRect) {
          drawBox(draftPageRect, draft, undefined, true);
        }
      }
    },
    [hotspots],
  );

  useEffect(() => {
    if (!isLinkEditMode) {
      setPendingHotspot(null);
      drawingStateRef.current = null;
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      const visible: number[] = [];
      pageElementsRef.current.forEach((el, idx) => {
        const r = el.getBoundingClientRect();
        if (r.width > 10 && r.height > 10) visible.push(idx);
      });
      setVisiblePageIndices(visible.length ? visible : [currentPageIndex]);
      drawHotspotCanvas(pendingHotspot);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [isLinkEditMode, currentPageIndex, hotspots, pendingHotspot, containerBoxSize, config.zoomLevel, drawHotspotCanvas]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isLinkEditMode || pendingHotspot) return;
    e.stopPropagation();
    e.preventDefault();

    const target = pageElementsRef.current
      .map((el, idx) => ({ idx, rect: el.getBoundingClientRect() }))
      .find(
        ({ rect }) =>
          rect.width > 10 &&
          rect.height > 10 &&
          e.clientX >= rect.left - 2 &&
          e.clientX <= rect.right + 2 &&
          e.clientY >= rect.top - 2 &&
          e.clientY <= rect.bottom + 2,
      );

    if (!target) return;

    drawingStateRef.current = {
      active: true,
      pageIndex: target.idx,
      pageRect: target.rect,
      startClientX: e.clientX,
      startClientY: e.clientY,
      draftRect: null,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = drawingStateRef.current;
    if (!state || !state.active) return;

    const { pageRect, startClientX, startClientY, pageIndex } = state;
    const clampedX = Math.min(pageRect.right, Math.max(pageRect.left, e.clientX));
    const clampedY = Math.min(pageRect.bottom, Math.max(pageRect.top, e.clientY));
    const startX = Math.min(pageRect.right, Math.max(pageRect.left, startClientX));
    const startY = Math.min(pageRect.bottom, Math.max(pageRect.top, startClientY));

    const leftPx = Math.min(startX, clampedX);
    const rightPx = Math.max(startX, clampedX);
    const topPx = Math.min(startY, clampedY);
    const bottomPx = Math.max(startY, clampedY);

    const draft: PendingHotspotRect = {
      page: pageIndex + 1,
      pageIndex,
      x: Number((((leftPx - pageRect.left) / pageRect.width) * 100).toFixed(2)),
      y: Number((((topPx - pageRect.top) / pageRect.height) * 100).toFixed(2)),
      width: Number((((rightPx - leftPx) / pageRect.width) * 100).toFixed(2)),
      height: Number((((bottomPx - topPx) / pageRect.height) * 100).toFixed(2)),
    };

    state.draftRect = draft;
    drawHotspotCanvas(draft);
  };

  const handleCanvasMouseUp = () => {
    const state = drawingStateRef.current;
    if (!state || !state.active) return;
    drawingStateRef.current = null;

    const draft = state.draftRect;
    if (draft && draft.width >= 2 && draft.height >= 2) {
      setHotspotUrlInput('https://');
      setPendingHotspot(draft);
      drawHotspotCanvas(draft);
    } else {
      drawHotspotCanvas(null);
    }
  };

  const handleConfirmHotspot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingHotspot) return;
    const normalized = normalizeHotspotUrl(hotspotUrlInput);
    if (!normalized) return;

    onAddHotspot({
      id: `hs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      page: pendingHotspot.page,
      pageIndex: pendingHotspot.pageIndex,
      x: pendingHotspot.x,
      y: pendingHotspot.y,
      width: pendingHotspot.width,
      height: pendingHotspot.height,
      url: normalized,
    });
    setPendingHotspot(null);
  };

  const handleCancelHotspot = () => {
    setPendingHotspot(null);
    drawHotspotCanvas(null);
  };

  const flipPrev = useCallback(() => {
    if (pageFlipRef.current) {
      pageFlipRef.current.flipPrev('top');
    } else {
      setCurrentPageIndex((p) => {
        const next = Math.max(0, p - 1);
        currentPageRef.current = next;
        return next;
      });
    }
  }, []);

  const flipNext = useCallback(() => {
    if (pageFlipRef.current) {
      pageFlipRef.current.flipNext('top');
    } else {
      setCurrentPageIndex((p) => {
        const next = Math.min(pages.length - 1, p + 1);
        currentPageRef.current = next;
        return next;
      });
    }
  }, [pages.length]);

  const jumpToPage = useCallback((idx: number, animateFlip = false) => {
    if (pageFlipRef.current) {
      if (animateFlip) {
        pageFlipRef.current.flip(idx, 'top');
      } else {
        pageFlipRef.current.turnToPage(idx);
        currentPageRef.current = idx;
        setCurrentPageIndex(idx);
        if (soundEnabledRef.current) {
          playPageFlipSound();
        }
      }
    }
  }, []);

  // Keyboard navigation & presentation shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        flipNext();
      } else if (e.key === 'ArrowLeft') {
        flipPrev();
      } else if (e.key === 'Home') {
        jumpToPage(0, false);
      } else if (e.key === 'End') {
        jumpToPage(pages.length - 1, false);
      } else if (e.key === 'r' || e.key === 'R') {
        onToggleReadingMode();
      } else if (e.key === 'f' || e.key === 'F') {
        void toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else if (isPreviewMode) {
          onExitPreview();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flipNext, flipPrev, jumpToPage, pages.length, onToggleReadingMode, isPreviewMode, onExitPreview, showShortcuts]);

  // Modo Lectura: automatic carousel transition every X configurable seconds
  useEffect(() => {
    if (!config.autoplay || !engineReady || isLinkEditMode || pages.length <= 1) return;
    const delayMs = Math.max(1000, config.autoplayIntervalMs || 5000);
    const timer = window.setTimeout(() => {
      const pf = pageFlipRef.current;
      if (!pf) return;
      const cur = pf.getCurrentPageIndex();
      if (cur >= pages.length - 1) {
        pf.turnToPage(0);
        currentPageRef.current = 0;
        setCurrentPageIndex(0);
        syncLazyPageImages(pageElementsRef.current, 0);
        if (soundEnabledRef.current) {
          playPageFlipSound();
        }
      } else {
        pf.flipNext('top');
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    config.autoplay,
    config.autoplayIntervalMs,
    engineReady,
    currentPageIndex,
    pages.length,
    isLinkEditMode,
  ]);

  // 4. Smart Pan & Zoom Drag Handlers when Zoom > 100% (disabled while drawing hotspots)
  const handlePanMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLinkEditMode || !isZoomPanActive) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: panOffset.x,
      origY: panOffset.y,
    };
  };

  useEffect(() => {
    if (!isPanning) return;
    const handleMove = (e: MouseEvent) => {
      const start = panStartRef.current;
      if (!start) return;
      setPanOffset({
        x: start.origX + (e.clientX - start.x),
        y: start.origY + (e.clientY - start.y),
      });
    };
    const handleUp = () => {
      setIsPanning(false);
      panStartRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isPanning]);

  const userZoomScale = config.zoomEnabled ? config.zoomLevel / 100 : 1;
  const hasManualZoom = config.zoomEnabled && config.zoomLevel !== 100;

  // Spine shadow appears on open interior spreads
  const isSpreadOpen = currentPageIndex > 0 && currentPageIndex < pages.length - 1;

  return (
    <div
      ref={stageRootRef}
      className="flex flex-col items-center justify-center w-full h-full min-h-0 flex-1 relative overflow-hidden p-4 sm:p-6 transition-colors duration-300"
      style={{ backgroundColor: config.bgColor }}
    >
      {/* Floating Corporate Brand Logo */}
      {config.brandLogo && (
        <a
          href={config.brandUrl || 'https://www.unfantasmaenelsistema.com/'}
          target="_blank"
          rel="noopener noreferrer"
          title={config.brandUrl || 'Sitio corporativo'}
          className={`absolute top-4 ${
            config.brandLogoPosition === 'top-right' ? 'right-4' : 'left-4'
          } z-30 h-11 w-11 rounded-lg bg-slate-900/85 border border-slate-700/80 p-1.5 flex items-center justify-center backdrop-blur hover:border-cyan-400/70 transition-colors shadow-lg`}
        >
          <img
            src={config.brandLogo}
            alt="Logo corporativo"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </a>
      )}
      {/* Optional Background Image */}
      {config.bgImage && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${config.bgImage})` }}
          aria-hidden="true"
        />
      )}

      {/* Overlay / Technical Grid */}
      <div
        className="absolute inset-0 canvas-grid-pattern pointer-events-none"
        style={{
          backgroundColor: config.bgImage
            ? `rgba(2, 6, 23, ${config.bgOverlayOpacity / 100})`
            : 'transparent',
        }}
        aria-hidden="true"
      />

      {/* 6. Loading Progress Overlay while PDF/PPTX pages render */}
      {parseProgress?.active && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <i className="fa-solid fa-gear fa-spin text-base" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold text-white truncate">
                  Procesando {parseProgress.format}
                </h2>
                <p className="text-xs text-slate-400 truncate">{parseProgress.fileName}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{parseProgress.statusText}</span>
                <span className="font-mono text-cyan-300">{parseProgress.percent}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-200"
                  style={{ width: `${parseProgress.percent}%` }}
                />
              </div>
            </div>

            <p className="text-xs font-mono text-slate-500">
              Procesando página {parseProgress.current} de {parseProgress.total}...
            </p>
          </div>
        </div>
      )}

      {/* Preview Mode Exit Button */}
      {isPreviewMode && (
        <button
          type="button"
          onClick={onExitPreview}
          className="absolute top-4 right-5 z-30 px-4 py-2 rounded-lg bg-slate-900/90 border border-slate-700 text-xs font-medium text-slate-200 hover:border-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-2 whitespace-nowrap shadow-lg"
        >
          <i className="fa-solid fa-compress" aria-hidden="true" />
          <span>Salir de Previsualización</span>
        </button>
      )}

      {/* Link Edit Mode Floating Status & Current Spread Hotspots */}
      {isLinkEditMode && !isPreviewMode && (
        <div className="relative z-30 mb-2 max-w-3xl w-full flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-cyan-500/40 bg-slate-900/95 backdrop-blur shadow-lg text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <i className="fa-solid fa-vector-square" aria-hidden="true" />
            <span className="font-medium">
              Arrastra sobre la página para dibujar un área de enlace
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {hotspots
              .filter((h) => visiblePageIndices.includes(h.pageIndex))
              .map((h) => (
                <span
                  key={h.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-cyan-500/35 bg-cyan-950/50 text-cyan-200 font-mono text-[11px]"
                >
                  <span>P.{h.page}</span>
                  <span className="max-w-[140px] truncate text-slate-300">{h.url}</span>
                  <button
                    type="button"
                    onClick={() => onDeleteHotspot(h.id)}
                    className="text-slate-400 hover:text-rose-400 transition-colors"
                    title="Eliminar enlace"
                    aria-label={`Eliminar enlace ${h.url}`}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* 1 & 4. Classic Centered Flexbox #canvas-wrapper + #flipbook-container with native StPageFlip size:"stretch" */}
      <div
        id="canvas-wrapper"
        ref={stageViewportRef}
        onMouseDown={handlePanMouseDown}
        onDoubleClick={() => {
          if (!isLinkEditMode && isZoomPanActive) {
            onChangeZoom(100);
            setPanOffset({ x: 0, y: 0 });
          }
        }}
        className={`w-full h-full flex-1 min-h-0 flex items-center justify-center relative overflow-hidden z-10 ${
          !isLinkEditMode && isZoomPanActive
            ? isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : ''
        }`}
      >
        {/* Left Navigation Button */}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            flipPrev();
          }}
          disabled={currentPageIndex === 0}
          aria-label="Página anterior"
          title="Página anterior (←)"
          className="hidden sm:flex absolute left-3 z-20 h-11 w-11 shrink-0 rounded-full border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/60 disabled:opacity-30 disabled:pointer-events-none items-center justify-center transition-colors shadow-lg"
        >
          <i className="fa-solid fa-chevron-left text-sm" aria-hidden="true" />
        </button>

        {/* Native Stretch Flipbook Container (NO forced CSS transform when zoom === 100%) */}
        <div
          id="flipbook-container"
          ref={flipbookContainerRef}
          className="relative flex items-center justify-center"
          style={{
            width: containerBoxSize ? `${containerBoxSize.width}px` : `${totalBookWidth}px`,
            height: containerBoxSize ? `${containerBoxSize.height}px` : `${bookHeight}px`,
            maxWidth: '90%',
            maxHeight: '90%',
            aspectRatio: `${totalBookWidth} / ${bookHeight}`,
            transform: hasManualZoom
              ? `translate(${panOffset.x}px, ${panOffset.y}px) scale(${userZoomScale})`
              : undefined,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 200ms ease-out',
          }}
        >
          <div
            ref={stageHostRef}
            className={`w-full h-full relative ${
              isLinkEditMode || isZoomPanActive
                ? 'pointer-events-none'
                : 'cursor-grab active:cursor-grabbing'
            }`}
          />

          {/* Realistic Central Spine Shadow on Open Spreads */}
          {config.dynamicShadows && isSpreadOpen && (
            <div className="gf-spine-shadow" aria-hidden="true" />
          )}

          {/* Phase 8: Interactive Canvas Overlay for Drawing Hotspot Areas */}
          {isLinkEditMode && (
            <canvas
              ref={hotspotCanvasRef}
              width={containerBoxSize?.width ?? totalBookWidth}
              height={containerBoxSize?.height ?? bookHeight}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="absolute inset-0 w-full h-full z-30 cursor-crosshair"
            />
          )}
        </div>

        {/* Right Navigation Button */}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            flipNext();
          }}
          disabled={currentPageIndex >= pages.length - 1}
          aria-label="Página siguiente"
          title="Página siguiente (→)"
          className="hidden sm:flex absolute right-3 z-20 h-11 w-11 shrink-0 rounded-full border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/60 disabled:opacity-30 disabled:pointer-events-none items-center justify-center transition-colors shadow-lg"
        >
          <i className="fa-solid fa-chevron-right text-sm" aria-hidden="true" />
        </button>

        {/* Subtle Pan Reset Helper when panned */}
        {isZoomPanActive && (panOffset.x !== 0 || panOffset.y !== 0) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPanOffset({ x: 0, y: 0 });
            }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg bg-slate-900/95 border border-slate-700 text-xs text-cyan-300 hover:border-cyan-400 transition-colors shadow-lg"
          >
            <i className="fa-solid fa-crosshairs mr-1.5" aria-hidden="true" />
            Centrar vista
          </button>
        )}
      </div>

      {/* 3. Collapsible Horizontal Thumbnail Strip */}
      {showThumbnails && (
        <div
          aria-label="Tira de miniaturas"
          className="relative z-20 mt-2 w-full max-w-4xl rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur p-2.5 shadow-2xl"
        >
          <div className="flex items-center gap-2.5 overflow-x-auto studio-scroll pb-1">
            {pages.map((page, idx) => {
              const isActive = idx === currentPageIndex;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => jumpToPage(idx, true)}
                  className={`group shrink-0 w-16 h-22 rounded-md border overflow-hidden relative flex flex-col items-center justify-center transition-all ${
                    isActive
                      ? 'border-cyan-400 ring-2 ring-cyan-400/35 bg-slate-950'
                      : 'border-slate-700/80 bg-slate-950/80 hover:border-slate-500'
                  }`}
                  title={`Ir a página ${idx + 1}`}
                >
                  {page.imageDataUrl ? (
                    <img
                      src={page.imageDataUrl}
                      alt={`Miniatura ${idx + 1}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full px-1.5 pt-1.5 pb-5 text-center overflow-hidden">
                      <span className="block text-[9px] font-mono text-cyan-400 truncate">
                        {idx === 0 ? 'PORTADA' : `P.${idx + 1}`}
                      </span>
                      <span className="block text-[9px] text-slate-300 line-clamp-2 break-words mt-0.5 leading-tight">
                        {page.title}
                      </span>
                    </div>
                  )}
                  <span
                    className={`absolute bottom-1 right-1 px-1 rounded text-[9px] font-mono ${
                      isActive
                        ? 'bg-cyan-400 text-slate-950 font-semibold'
                        : 'bg-slate-950/85 text-slate-300'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Floating Navigation Controls */}
      <div className="relative z-20 mt-3 overflow-hidden flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-900/95 border border-slate-800 shadow-lg backdrop-blur">
        {config.autoplay && !isLinkEditMode && pages.length > 1 && (
          <div
            key={`reading-${currentPageIndex}-${config.autoplayIntervalMs}`}
            aria-hidden="true"
            className="gf-reading-progress absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400"
            style={{ animationDuration: `${Math.max(1000, config.autoplayIntervalMs)}ms` }}
          />
        )}

        <button
          type="button"
          onClick={() => jumpToPage(0, false)}
          disabled={currentPageIndex === 0}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
          aria-label="Ir a portada"
          title="Portada"
        >
          <i className="fa-solid fa-backward-step text-xs" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={flipPrev}
          disabled={currentPageIndex === 0}
          className="h-9 px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors whitespace-nowrap"
          aria-label="Página anterior"
        >
          <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {isEditingPageJump ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = Number(pageJumpInput);
              if (!Number.isNaN(parsed)) {
                const targetIdx = Math.min(pages.length - 1, Math.max(0, Math.round(parsed) - 1));
                jumpToPage(targetIdx, true);
              }
              setIsEditingPageJump(false);
            }}
            className="flex items-center gap-1 px-1.5"
          >
            <input
              type="number"
              min={1}
              max={pages.length}
              autoFocus
              value={pageJumpInput}
              onChange={(e) => setPageJumpInput(e.target.value)}
              onBlur={() => setIsEditingPageJump(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsEditingPageJump(false);
              }}
              aria-label="Ir a número de página"
              className="w-12 rounded border border-cyan-400 bg-slate-950 px-1.5 py-0.5 text-center text-xs font-mono text-cyan-300 focus:outline-none"
            />
            <span className="text-xs font-mono text-slate-400">/ {pages.length}</span>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPageJumpInput(String(currentPageIndex + 1));
              setIsEditingPageJump(true);
            }}
            className="px-2 sm:px-3 py-1 rounded-md text-xs font-mono text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors whitespace-nowrap"
            title="Haz clic para saltar a una página específica"
          >
            {currentPageIndex === 0
              ? `Portada · 1 / ${pages.length}`
              : currentPageIndex >= pages.length - 1
                ? `Contraportada · ${pages.length} / ${pages.length}`
                : `Pág. ${currentPageIndex + 1} / ${pages.length}`}
          </button>
        )}

        <button
          type="button"
          onClick={flipNext}
          disabled={currentPageIndex >= pages.length - 1}
          className="h-9 px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors whitespace-nowrap"
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => jumpToPage(pages.length - 1, false)}
          disabled={currentPageIndex >= pages.length - 1}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
          aria-label="Ir a contraportada"
          title="Contraportada"
        >
          <i className="fa-solid fa-forward-step text-xs" aria-hidden="true" />
        </button>

        {/* Modo Lectura (Autoplay Carousel) Controls */}
        <div className="flex items-center gap-1 pl-1.5 ml-0.5 border-l border-slate-800">
          <button
            type="button"
            onClick={onToggleReadingMode}
            aria-pressed={config.autoplay}
            className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              config.autoplay
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-300 hover:text-emerald-300 hover:bg-slate-800 border border-transparent'
            }`}
            title={config.autoplay ? 'Pausar Modo Lectura' : 'Iniciar Modo Lectura (carrusel)'}
          >
            <i
              className={`fa-solid ${config.autoplay ? 'fa-pause' : 'fa-play'} text-xs`}
              aria-hidden="true"
            />
            <span className="hidden md:inline">Lectura</span>
          </button>

          <div
            role="group"
            aria-label="Segundos entre páginas"
            className="flex items-center rounded-lg border border-slate-800 bg-slate-950/70 px-0.5 h-8"
          >
            <button
              type="button"
              onClick={() => {
                const currentSec = Math.max(1, Math.round(config.autoplayIntervalMs / 1000));
                onChangeReadingInterval(Math.max(1, currentSec - 1) * 1000);
              }}
              className="h-7 w-6 rounded flex items-center justify-center text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
              aria-label="Reducir segundos de Modo Lectura"
              title="Menos segundos"
            >
              <i className="fa-solid fa-minus text-[10px]" aria-hidden="true" />
            </button>
            <span
              className="px-1.5 text-[11px] font-mono text-emerald-300 whitespace-nowrap"
              title="Intervalo del carrusel automático"
            >
              {Math.max(1, Math.round(config.autoplayIntervalMs / 1000))}s
            </span>
            <button
              type="button"
              onClick={() => {
                const currentSec = Math.max(1, Math.round(config.autoplayIntervalMs / 1000));
                onChangeReadingInterval(Math.min(60, currentSec + 1) * 1000);
              }}
              className="h-7 w-6 rounded flex items-center justify-center text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
              aria-label="Aumentar segundos de Modo Lectura"
              title="Más segundos"
            >
              <i className="fa-solid fa-plus text-[10px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Thumbnails Toggle Button */}
        <div className="pl-1.5 ml-0.5 border-l border-slate-800">
          <button
            type="button"
            onClick={() => setShowThumbnails((prev) => !prev)}
            aria-pressed={showThumbnails}
            className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              showThumbnails
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800 border border-transparent'
            }`}
            title="Mostrar u ocultar miniaturas"
          >
            <i className="fa-solid fa-table-cells text-xs" aria-hidden="true" />
            <span className="hidden md:inline">Miniaturas</span>
          </button>
        </div>

        {config.zoomEnabled && (
          <div className="flex items-center gap-1 pl-1.5 ml-0.5 border-l border-slate-800">
            <button
              type="button"
              onClick={() => onChangeZoom(Math.max(60, config.zoomLevel - 10))}
              className="h-8 w-8 rounded-md flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
              aria-label="Reducir zoom"
            >
              <i className="fa-solid fa-minus text-xs" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeZoom(100);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="text-xs font-mono text-cyan-300 w-11 text-center hover:bg-slate-800 rounded py-1 transition-colors"
              title="Restablecer zoom"
            >
              {config.zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => onChangeZoom(Math.min(150, config.zoomLevel + 10))}
              className="h-8 w-8 rounded-md flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
              aria-label="Aumentar zoom"
            >
              <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Fullscreen & Shortcuts Help */}
        <div className="flex items-center gap-1 pl-1.5 ml-0.5 border-l border-slate-800">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="h-8 w-8 rounded-md flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            title={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
          >
            <i
              className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-xs`}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={() => setShowShortcuts((prev) => !prev)}
            aria-expanded={showShortcuts}
            className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
              showShortcuts
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
            }`}
            aria-label="Atajos de teclado"
            title="Atajos de teclado"
          >
            <i className="fa-solid fa-keyboard text-xs" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Floating Card */}
      {showShortcuts && (
        <div
          role="dialog"
          aria-label="Atajos de teclado"
          className="absolute bottom-20 right-5 z-30 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur text-xs space-y-2"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-display font-semibold text-slate-100">Atajos de teclado</span>
            <button
              type="button"
              onClick={() => setShowShortcuts(false)}
              className="text-slate-400 hover:text-white"
              aria-label="Cerrar atajos"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Anterior / Siguiente</span>
              <span className="text-cyan-300">← / →</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Portada / Final</span>
              <span className="text-cyan-300">Home / End</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Modo Lectura</span>
              <span className="text-emerald-300">R</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Pantalla completa</span>
              <span className="text-cyan-300">F</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Salir previsualización</span>
              <span className="text-cyan-300">Esc</span>
            </div>
          </div>
        </div>
      )}

      {/* Phase 8: Floating Modal asking for Target URL when rectangle drawing completes */}
      {pendingHotspot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hotspot-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs"
        >
          <form
            onSubmit={handleConfirmHotspot}
            className="w-full max-w-sm rounded-xl border border-cyan-500/40 bg-slate-900 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-link text-cyan-400 text-sm" aria-hidden="true" />
                <h3 id="hotspot-modal-title" className="font-display text-sm font-semibold text-white">
                  Nuevo Enlace · Página {pendingHotspot.page}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {Math.round(pendingHotspot.width)}% × {Math.round(pendingHotspot.height)}%
              </span>
            </div>

            <div>
              <label htmlFor="hotspot-url-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                URL de destino
              </label>
              <input
                id="hotspot-url-input"
                type="text"
                autoFocus
                required
                placeholder="https://unfantasmaenelsistema.com"
                value={hotspotUrlInput}
                onChange={(e) => setHotspotUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCancelHotspot();
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelHotspot}
                className="px-3.5 py-2 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-semibold transition-colors"
              >
                Guardar enlace
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
