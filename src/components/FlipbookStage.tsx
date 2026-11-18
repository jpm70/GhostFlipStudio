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
import { LoadingOverlay } from './stage/LoadingOverlay';
import { LinkEditBar } from './stage/LinkEditBar';
import { ThumbnailStrip } from './stage/ThumbnailStrip';
import { ControlsBar } from './stage/ControlsBar';
import { ShortcutsCard } from './stage/ShortcutsCard';
import { HotspotUrlDialog } from './stage/HotspotUrlDialog';
import type { StPageFlipInstance } from './stage/stPageFlip';
import {
  buildPageElement,
  createPageNumberOverlay,
  normalizeHotspotUrl,
  syncLazyPageImages,
  syncPageHotspotLinks,
} from './stage/pageElements';
import type { PendingHotspotRect } from './stage/pageElements';

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
      className="keep-dark flex flex-col items-center justify-center w-full h-full min-h-0 flex-1 relative overflow-hidden p-4 sm:p-6 transition-colors duration-300"
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

      {parseProgress?.active && <LoadingOverlay progress={parseProgress!} />}
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

      {isLinkEditMode && !isPreviewMode && <LinkEditBar hotspots={hotspots} visiblePageIndices={visiblePageIndices} onDeleteHotspot={onDeleteHotspot} />}
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

      {showThumbnails && <ThumbnailStrip pages={pages} currentPageIndex={currentPageIndex} onJump={jumpToPage} />}
      <ControlsBar config={config} pages={pages} isLinkEditMode={isLinkEditMode} currentPageIndex={currentPageIndex} showThumbnails={showThumbnails} setShowThumbnails={setShowThumbnails} showShortcuts={showShortcuts} setShowShortcuts={setShowShortcuts} isEditingPageJump={isEditingPageJump} setIsEditingPageJump={setIsEditingPageJump} pageJumpInput={pageJumpInput} setPageJumpInput={setPageJumpInput} isFullscreen={isFullscreen} jumpToPage={jumpToPage} flipPrev={flipPrev} flipNext={flipNext} toggleFullscreen={toggleFullscreen} onChangeZoom={onChangeZoom} onToggleReadingMode={onToggleReadingMode} onChangeReadingInterval={onChangeReadingInterval} resetPan={() => setPanOffset({ x: 0, y: 0 })} />

      {showShortcuts && <ShortcutsCard onClose={() => setShowShortcuts(false)} />}
      {pendingHotspot && <HotspotUrlDialog pending={pendingHotspot} urlInput={hotspotUrlInput} setUrlInput={setHotspotUrlInput} onSubmit={handleConfirmHotspot} onCancel={handleCancelHotspot} />}
    </div>
  );
};
