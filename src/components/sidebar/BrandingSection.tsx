import React, { useRef, useState } from 'react';
import type { BookConfig } from '../../types/flipbook';
import { DEFAULT_LOGO } from '../../utils/assets';
import { renderToggle } from './Toggle';

interface BrandingSectionProps {
  open: boolean;
  config: BookConfig;
  onChangeConfig: (patch: Partial<BookConfig>) => void;
}

export const BrandingSection: React.FC<BrandingSectionProps> = ({ open, config, onChangeConfig }) => {
  const [showPassword, setShowPassword] = useState(false);
  const brandLogoInputRef = useRef<HTMLInputElement>(null);

  const handleBrandLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangeConfig({ brandLogo: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!open) return null;

  return (
              <div className="px-5 pb-5 pt-1 space-y-4">
                {/* Logo Corporativo */}
                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-2">
                    Logo Corporativo
                  </span>
                  <input
                    ref={brandLogoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBrandLogoUpload}
                  />
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-950 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={config.brandLogo}
                        alt="Logo corporativo actual"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => brandLogoInputRef.current?.click()}
                      className="flex-1 px-3 py-2 text-xs font-medium rounded-md border border-slate-700 bg-slate-950 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <i className="fa-solid fa-upload text-[11px]" aria-hidden="true" />
                      <span>Subir logo</span>
                    </button>
                    {config.brandLogo !== DEFAULT_LOGO && (
                      <button
                        type="button"
                        onClick={() =>
                          onChangeConfig({ brandLogo: DEFAULT_LOGO })
                        }
                        className="px-2.5 py-2 text-xs rounded-md border border-slate-700 bg-slate-950 text-slate-300 hover:text-cyan-300 transition-colors"
                        title="Restaurar logo por defecto"
                        aria-label="Restaurar logo por defecto"
                      >
                        <i className="fa-solid fa-rotate-left text-xs" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* Corner Position */}
                  <div className="grid grid-cols-2 gap-1 p-1 mt-2 rounded-lg bg-slate-950 border border-slate-800">
                    {(
                      [
                        { id: 'top-left', label: 'Sup. Izquierda' },
                        { id: 'top-right', label: 'Sup. Derecha' },
                      ] as const
                    ).map((pos) => {
                      const active = config.brandLogoPosition === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => onChangeConfig({ brandLogoPosition: pos.id })}
                          className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
                              : 'text-slate-400 hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          {pos.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Enlace del Logo */}
                <div>
                  <label htmlFor="brand-url" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Enlace del Logo (URL)
                  </label>
                  <input
                    id="brand-url"
                    type="url"
                    placeholder="https://ghostacademy.unfantasmaenelsistema.com"
                    value={config.brandUrl}
                    onChange={(e) => onChangeConfig({ brandUrl: e.target.value })}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Metadatos SEO */}
                <div className="pt-2 border-t border-slate-800/80 space-y-3">
                  <span className="block text-xs font-semibold text-slate-200">
                    Metadatos SEO (HTML Exportado)
                  </span>
                  <div>
                    <label htmlFor="seo-title" className="block text-xs text-slate-400 mb-1">
                      Título de la Revista
                    </label>
                    <input
                      id="seo-title"
                      type="text"
                      value={config.seoTitle}
                      onChange={(e) => onChangeConfig({ seoTitle: e.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="seo-desc" className="block text-xs text-slate-400 mb-1">
                      Descripción
                    </label>
                    <textarea
                      id="seo-desc"
                      rows={2}
                      value={config.seoDescription}
                      onChange={(e) => onChangeConfig({ seoDescription: e.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="seo-keywords" className="block text-xs text-slate-400 mb-1">
                      Keywords
                    </label>
                    <input
                      id="seo-keywords"
                      type="text"
                      placeholder="revista, pdf, ciberseguridad"
                      value={config.seoKeywords}
                      onChange={(e) => onChangeConfig({ seoKeywords: e.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Protección por Contraseña (Cliente) */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  {renderToggle(
                    'toggle-password',
                    'Protección por Contraseña',
                    config.passwordProtected,
                    (next) => onChangeConfig({ passwordProtected: next }),
                    'fa-solid fa-lock',
                    'Solicita clave antes de mostrar el HTML exportado',
                  )}

                  {config.passwordProtected && (
                    <div className="pl-6">
                      <label htmlFor="export-password" className="block text-xs text-slate-400 mb-1">
                        Contraseña de acceso
                      </label>
                      <div className="relative">
                        <input
                          id="export-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Introduce una clave..."
                          value={config.passwordValue}
                          onChange={(e) => onChangeConfig({ passwordValue: e.target.value })}
                          className="w-full rounded-md border border-slate-700 bg-slate-950 pl-3 pr-9 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300"
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          <i
                            className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
  );
};
