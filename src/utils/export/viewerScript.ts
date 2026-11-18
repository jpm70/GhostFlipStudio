import type { ViewerContext } from './context';

/** Lógica del visor en el navegador (paso de página, Modo Lectura, miniaturas, zoom…). */
export function buildViewerScript(ctx: ViewerContext): string {
  const { serializedPages, serializedHotspots, serializedConfig, safeAudioUri } = ctx;
  return `    const viewerRootEl = document.getElementById('viewer-root');
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
`;
}
