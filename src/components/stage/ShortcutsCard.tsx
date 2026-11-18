import React from 'react';

interface ShortcutsCardProps {
  onClose: () => void;
}

export const ShortcutsCard: React.FC<ShortcutsCardProps> = ({ onClose }) => (
  <>
        <div
          role="dialog"
          aria-label="Atajos de teclado"
          className="absolute bottom-20 right-5 z-30 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur text-xs space-y-2"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-display font-semibold text-slate-100">Atajos de teclado</span>
            <button
              type="button"
              onClick={() => onClose()}
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
  </>
);
