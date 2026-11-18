import React from 'react';
import type { BookConfig, CoverType } from '../../types/flipbook';
import { DIMENSION_PRESETS } from './presets';

interface BookSectionProps {
  open: boolean;
  config: BookConfig;
  onChangeConfig: (patch: Partial<BookConfig>) => void;
}

export const BookSection: React.FC<BookSectionProps> = ({ open, config, onChangeConfig }) => {

  if (!open) return null;

  return (
              <div className="px-5 pb-5 pt-1 space-y-4">
                {/* Width & Height */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="book-width"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Ancho (px)
                    </label>
                    <input
                      id="book-width"
                      type="number"
                      min={480}
                      max={1100}
                      step={10}
                      value={config.width}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!Number.isNaN(val)) {
                          onChangeConfig({ width: Math.min(1100, Math.max(480, val)) });
                        }
                      }}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="book-height"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Alto (px)
                    </label>
                    <input
                      id="book-height"
                      type="number"
                      min={360}
                      max={820}
                      step={10}
                      value={config.height}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!Number.isNaN(val)) {
                          onChangeConfig({ height: Math.min(820, Math.max(360, val)) });
                        }
                      }}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="block text-xs text-slate-400 mb-1.5">Formatos rápidos</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DIMENSION_PRESETS.map((preset) => {
                      const active =
                        config.width === preset.width && config.height === preset.height;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            onChangeConfig({ width: preset.width, height: preset.height })
                          }
                          className={`px-2 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap truncate ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hard vs Soft Cover */}
                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">
                    Encuadernación
                  </span>
                  <div
                    role="group"
                    aria-label="Tipo de tapa"
                    className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800"
                  >
                    {(['hard', 'soft'] as CoverType[]).map((type) => {
                      const active = config.coverType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => onChangeConfig({ coverType: type })}
                          className={`px-3 py-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
                              : 'text-slate-400 hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          <i
                            className={`fa-solid ${
                              type === 'hard' ? 'fa-book' : 'fa-book-open-reader'
                            }`}
                            aria-hidden="true"
                          />
                          <span>{type === 'hard' ? 'Tapa Dura' : 'Tapa Blanda'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Flipping Time Slider */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label htmlFor="book-flipping-time" className="font-medium text-slate-300">
                      Velocidad de pasada
                    </label>
                    <span className="font-mono text-cyan-300">{config.flippingTime} ms</span>
                  </div>
                  <input
                    id="book-flipping-time"
                    type="range"
                    min={250}
                    max={1500}
                    step={50}
                    value={config.flippingTime}
                    onChange={(e) => onChangeConfig({ flippingTime: Number(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-0.5">
                    <span>Rápido (250ms)</span>
                    <span>Suave (1500ms)</span>
                  </div>
                </div>
              </div>
  );
};
