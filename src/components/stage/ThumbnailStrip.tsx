import React from 'react';
import type { FlipbookPage } from '../../types/flipbook';

interface ThumbnailStripProps {
  pages: FlipbookPage[];
  currentPageIndex: number;
  onJump: (index: number, animate?: boolean) => void;
}

export const ThumbnailStrip: React.FC<ThumbnailStripProps> = ({ pages, currentPageIndex, onJump }) => (
  <>
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
                  onClick={() => onJump(idx, true)}
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
  </>
);
