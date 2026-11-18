import React from 'react';
import type { HotspotItem } from '../../types/flipbook';

interface LinkEditBarProps {
  hotspots: HotspotItem[];
  visiblePageIndices: number[];
  onDeleteHotspot: (id: string) => void;
}

export const LinkEditBar: React.FC<LinkEditBarProps> = ({ hotspots, visiblePageIndices, onDeleteHotspot }) => (
  <>
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
  </>
);
