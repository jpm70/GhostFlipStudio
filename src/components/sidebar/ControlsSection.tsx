import React from 'react';
import type { BookConfig } from '../../types/flipbook';
import { playPageFlipSound } from '../../utils/sound';
import { renderToggle } from './Toggle';

interface ControlsSectionProps {
  open: boolean;
  config: BookConfig;
  onChangeConfig: (patch: Partial<BookConfig>) => void;
}

export const ControlsSection: React.FC<ControlsSectionProps> = ({ open, config, onChangeConfig }) => {

  if (!open) return null;

  return (
              <div className="px-5 pb-5 pt-1 space-y-3">
                {/* Page Turn Sound */}
                <div>
                  {renderToggle(
                    'toggle-sound',
                    'Sonido de página',
                    config.soundEnabled,
                    (next) => {
                      onChangeConfig({ soundEnabled: next });
                      if (next) playPageFlipSound();
                    },
                    'fa-solid fa-volume-high',
                    'Efecto acústico al pasar cada hoja',
                  )}
                </div>

                {/* Modo Lectura (Autoplay / Carrusel) */}
                <div className="pt-2 border-t border-slate-800/80">
                  {renderToggle(
                    'toggle-autoplay',
                    'Modo Lectura',
                    config.autoplay,
                    (next) => onChangeConfig({ autoplay: next }),
                    'fa-solid fa-book-open-reader',
                    'Carrusel automático cada X segundos',
                  )}

                  <div className="mt-2.5 pl-6 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="reading-interval-input" className="text-xs text-slate-400">
                        Intervalo (segundos)
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          id="reading-interval-input"
                          type="number"
                          min={1}
                          max={60}
                          step={1}
                          value={Math.max(1, Math.round(config.autoplayIntervalMs / 1000))}
                          onChange={(e) => {
                            const sec = Number(e.target.value);
                            if (!Number.isNaN(sec)) {
                              const clamped = Math.min(60, Math.max(1, Math.round(sec)));
                              onChangeConfig({ autoplayIntervalMs: clamped * 1000 });
                            }
                          }}
                          className="w-14 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right text-xs font-mono text-cyan-300 focus:border-cyan-400 focus:outline-none"
                        />
                        <span className="text-xs font-mono text-slate-400">s</span>
                      </div>
                    </div>

                    <input
                      aria-label="Segundos entre páginas en Modo Lectura"
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={Math.min(30, Math.max(1, Math.round(config.autoplayIntervalMs / 1000)))}
                      onChange={(e) =>
                        onChangeConfig({ autoplayIntervalMs: Number(e.target.value) * 1000 })
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />

                    <div className="grid grid-cols-4 gap-1">
                      {[3000, 5000, 8000, 12000].map((ms) => (
                        <button
                          key={ms}
                          type="button"
                          onClick={() => onChangeConfig({ autoplayIntervalMs: ms })}
                          className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                            config.autoplayIntervalMs === ms
                              ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {ms / 1000}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Zoom */}
                <div className="pt-2 border-t border-slate-800/80">
                  {renderToggle(
                    'toggle-zoom',
                    'Habilitar Zoom',
                    config.zoomEnabled,
                    (next) =>
                      onChangeConfig({
                        zoomEnabled: next,
                        zoomLevel: next ? config.zoomLevel : 100,
                      }),
                    'fa-solid fa-magnifying-glass-plus',
                    'Controles de escala en el visor',
                  )}

                  {config.zoomEnabled && (
                    <div className="mt-2 pl-6">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Escala actual</span>
                        <span className="font-mono text-cyan-300">{config.zoomLevel}%</span>
                      </div>
                      <input
                        type="range"
                        min={60}
                        max={150}
                        step={5}
                        value={config.zoomLevel}
                        onChange={(e) => onChangeConfig({ zoomLevel: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
  );
};
