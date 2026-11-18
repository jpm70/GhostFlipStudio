import React from 'react';
import type { PendingHotspotRect } from './pageElements';

interface HotspotUrlDialogProps {
  pending: PendingHotspotRect;
  urlInput: string;
  setUrlInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const HotspotUrlDialog: React.FC<HotspotUrlDialogProps> = ({ pending, urlInput, setUrlInput, onSubmit, onCancel }) => (
  <>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hotspot-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs"
        >
          <form
            onSubmit={onSubmit}
            className="w-full max-w-sm rounded-xl border border-cyan-500/40 bg-slate-900 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-link text-cyan-400 text-sm" aria-hidden="true" />
                <h3 id="hotspot-modal-title" className="font-display text-sm font-semibold text-white">
                  Nuevo Enlace · Página {pending.page}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {Math.round(pending.width)}% × {Math.round(pending.height)}%
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
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancel();
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
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
  </>
);
