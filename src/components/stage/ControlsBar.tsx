import React from 'react';
import type { BookConfig, FlipbookPage } from '../../types/flipbook';

interface ControlsBarProps {
  config: BookConfig;
  pages: FlipbookPage[];
  isLinkEditMode: boolean;
  currentPageIndex: number;
  showThumbnails: boolean;
  setShowThumbnails: React.Dispatch<React.SetStateAction<boolean>>;
  showShortcuts: boolean;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  isEditingPageJump: boolean;
  setIsEditingPageJump: React.Dispatch<React.SetStateAction<boolean>>;
  pageJumpInput: string;
  setPageJumpInput: React.Dispatch<React.SetStateAction<string>>;
  isFullscreen: boolean;
  jumpToPage: (index: number, animate?: boolean) => void;
  flipPrev: () => void;
  flipNext: () => void;
  toggleFullscreen: () => void | Promise<void>;
  onChangeZoom: (nextZoom: number) => void;
  onToggleReadingMode: () => void;
  onChangeReadingInterval: (intervalMs: number) => void;
  resetPan: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({ config, pages, isLinkEditMode, currentPageIndex, showThumbnails, setShowThumbnails, showShortcuts, setShowShortcuts, isEditingPageJump, setIsEditingPageJump, pageJumpInput, setPageJumpInput, isFullscreen, jumpToPage, flipPrev, flipNext, toggleFullscreen, onChangeZoom, onToggleReadingMode, onChangeReadingInterval, resetPan }) => (
  <>
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
                resetPan();
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
  </>
);
