import React from 'react';
import type { ParseProgress } from '../../types/flipbook';

interface LoadingOverlayProps {
  progress: ParseProgress;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress }) => (
  <>
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
                  Procesando {progress.format}
                </h2>
                <p className="text-xs text-slate-400 truncate">{progress.fileName}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{progress.statusText}</span>
                <span className="font-mono text-cyan-300">{progress.percent}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            <p className="text-xs font-mono text-slate-500">
              Procesando página {progress.current} de {progress.total}...
            </p>
          </div>
        </div>
  </>
);
