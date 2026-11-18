import React, { useRef } from 'react';
import type { BookConfig } from '../../types/flipbook';
import { BG_COLOR_PRESETS } from './presets';
import { renderToggle } from './Toggle';

interface AppearanceSectionProps {
  open: boolean;
  config: BookConfig;
  onChangeConfig: (patch: Partial<BookConfig>) => void;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({ open, config, onChangeConfig }) => {
  const bgImgInputRef = useRef<HTMLInputElement>(null);

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangeConfig({ bgImage: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!open) return null;

  return (
              <div className="px-5 pb-5 pt-1 space-y-4">
                {/* Background Color */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="bg-color-picker" className="text-xs font-medium text-slate-300">
                      Color de fondo
                    </label>
                    <span className="text-xs font-mono text-slate-400 uppercase">
                      {config.bgColor}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="bg-color-picker"
                      type="color"
                      value={config.bgColor}
                      onChange={(e) => onChangeConfig({ bgColor: e.target.value })}
                      className="h-9 w-10 rounded border border-slate-700 bg-slate-950 p-0.5 cursor-pointer shrink-0"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {BG_COLOR_PRESETS.map((preset) => {
                        const selected =
                          config.bgColor.toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => onChangeConfig({ bgColor: preset.hex })}
                            title={preset.label}
                            aria-label={`Color ${preset.label}`}
                            style={{ backgroundColor: preset.hex }}
                            className={`w-7 h-7 rounded-md border transition-transform ${
                              selected
                                ? 'border-cyan-400 scale-105 ring-1 ring-cyan-400/50'
                                : 'border-slate-700 hover:border-slate-500'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Background Image */}
                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-2">
                    Imagen de fondo
                  </span>
                  <input
                    ref={bgImgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBgImageUpload}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => bgImgInputRef.current?.click()}
                      className="flex-1 px-3 py-2 text-xs font-medium rounded-md border border-slate-700 bg-slate-950 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <i className="fa-regular fa-image" aria-hidden="true" />
                      <span>{config.bgImage ? 'Cambiar imagen' : 'Subir imagen'}</span>
                    </button>
                    {config.bgImage && (
                      <button
                        type="button"
                        onClick={() => onChangeConfig({ bgImage: null })}
                        className="px-3 py-2 text-xs font-medium rounded-md border border-slate-700 bg-slate-950 text-slate-300 hover:text-rose-400 hover:border-rose-500/50 transition-colors"
                        title="Quitar imagen de fondo"
                        aria-label="Quitar imagen de fondo"
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {config.bgImage && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Oscurecer fondo</span>
                        <span className="font-mono">{config.bgOverlayOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={85}
                        value={config.bgOverlayOpacity}
                        onChange={(e) =>
                          onChangeConfig({ bgOverlayOpacity: Number(e.target.value) })
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Dynamic Shadows */}
                <div className="pt-1 border-t border-slate-800/80">
                  {renderToggle(
                    'toggle-shadows',
                    'Sombras dinámicas',
                    config.dynamicShadows,
                    (next) => onChangeConfig({ dynamicShadows: next }),
                    'fa-solid fa-circle-half-stroke',
                    'Profundidad realista en lomo y bordes',
                  )}

                  {config.dynamicShadows && (
                    <div className="mt-2 pl-6">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Intensidad</span>
                        <span className="font-mono">{config.shadowIntensity}%</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        value={config.shadowIntensity}
                        onChange={(e) =>
                          onChangeConfig({ shadowIntensity: Number(e.target.value) })
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
  );
};
