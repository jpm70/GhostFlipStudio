import React from 'react';
import type {
  AccordionSectionId,
  BookConfig,
  CoverType,
  ParseProgress,
  UploadedDocument,
} from '../types/flipbook';
import { DEFAULT_LOGO } from '../utils/assets';
import { UploadSection } from './sidebar/UploadSection';
import { BookSection } from './sidebar/BookSection';
import { AppearanceSection } from './sidebar/AppearanceSection';
import { ControlsSection } from './sidebar/ControlsSection';
import { BrandingSection } from './sidebar/BrandingSection';

interface SidebarProps {
  config: BookConfig;
  onChangeConfig: (patch: Partial<BookConfig>) => void;
  uploadedDoc: UploadedDocument | null;
  parseProgress: ParseProgress | null;
  parseError: string | null;
  onFileUpload: (file: File) => void;
  onRemotePdfLoad: (url: string) => void;
  onClearDocument: () => void;
  onResetConfig: () => void;
  openSections: Record<AccordionSectionId, boolean>;
  onToggleSection: (id: AccordionSectionId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const BG_COLOR_PRESETS = [
  { label: 'Obsidiana', hex: '#020617' },
  { label: 'Pizarra', hex: '#0f172a' },
  { label: 'Terminal', hex: '#031510' },
  { label: 'Cobalto', hex: '#071426' },
  { label: 'Grafito', hex: '#18181b' },
];

const DIMENSION_PRESETS = [
  { label: 'Revista 4:3', width: 840, height: 580 },
  { label: 'A4 Editorial', width: 760, height: 540 },
  { label: 'Cuadrado', width: 700, height: 680 },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  onChangeConfig,
  uploadedDoc,
  parseProgress,
  parseError,
  onFileUpload,
  onRemotePdfLoad,
  onClearDocument,
  onResetConfig,
  openSections,
  onToggleSection,
  isOpenMobile,
  onCloseMobile,
}) => {



  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/75 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Panel de configuración"
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[320px] xl:w-[344px] shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full transition-transform duration-200 ease-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 group min-w-0 focus-visible:outline-2 focus-visible:outline-cyan-400 rounded-md"
            title="Visitar Un Fantasma en el Sistema"
          >
            <div className="w-11 h-11 rounded-lg bg-slate-800/80 border border-slate-700/80 p-1 flex items-center justify-center shrink-0 group-hover:border-cyan-400/60 transition-colors">
              <img
                src={DEFAULT_LOGO}
                alt="Logo Un Fantasma en el Sistema"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <span className="font-display text-lg font-bold tracking-tight text-slate-100 block truncate group-hover:text-cyan-300 transition-colors">
                GhostFlip Studio
              </span>
              <span className="text-xs text-slate-400 block truncate">
                unfantasmaenelsistema.com
              </span>
            </div>
          </a>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-100 rounded-md focus-visible:outline-2 focus-visible:outline-cyan-400"
            aria-label="Cerrar panel"
          >
            <i className="fa-solid fa-xmark text-base" aria-hidden="true" />
          </button>
        </div>

        {/* Accordion Sections */}
        <div className="flex-1 overflow-y-auto studio-scroll divide-y divide-slate-800">
          {/* 1. Carga de Archivos */}
          <section>
            <button
              type="button"
              aria-expanded={openSections.upload}
              onClick={() => onToggleSection('upload')}
              className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/40 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-cyan-400"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-100">
                <i className="fa-solid fa-file-arrow-up text-cyan-400 w-4 text-center" aria-hidden="true" />
                <span>Carga de Archivos</span>
              </span>
              <i
                className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200 ${
                  openSections.upload ? 'rotate-180 text-cyan-400' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <UploadSection open={openSections.upload} uploadedDoc={uploadedDoc} parseProgress={parseProgress} parseError={parseError} onFileUpload={onFileUpload} onRemotePdfLoad={onRemotePdfLoad} onClearDocument={onClearDocument} />
          </section>

          {/* 2. Configuración de Libro */}
          <section>
            <button
              type="button"
              aria-expanded={openSections.book}
              onClick={() => onToggleSection('book')}
              className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/40 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-cyan-400"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-100">
                <i className="fa-solid fa-book-open text-cyan-400 w-4 text-center" aria-hidden="true" />
                <span>Configuración de Libro</span>
              </span>
              <i
                className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200 ${
                  openSections.book ? 'rotate-180 text-cyan-400' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <BookSection open={openSections.book} config={config} onChangeConfig={onChangeConfig} />
          </section>

          {/* 3. Apariencia */}
          <section>
            <button
              type="button"
              aria-expanded={openSections.appearance}
              onClick={() => onToggleSection('appearance')}
              className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/40 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-cyan-400"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-100">
                <i className="fa-solid fa-palette text-cyan-400 w-4 text-center" aria-hidden="true" />
                <span>Apariencia</span>
              </span>
              <i
                className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200 ${
                  openSections.appearance ? 'rotate-180 text-cyan-400' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <AppearanceSection open={openSections.appearance} config={config} onChangeConfig={onChangeConfig} />
          </section>

          {/* 4. Controles */}
          <section>
            <button
              type="button"
              aria-expanded={openSections.controls}
              onClick={() => onToggleSection('controls')}
              className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/40 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-cyan-400"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-100">
                <i className="fa-solid fa-sliders text-cyan-400 w-4 text-center" aria-hidden="true" />
                <span>Controles</span>
              </span>
              <i
                className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200 ${
                  openSections.controls ? 'rotate-180 text-cyan-400' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <ControlsSection open={openSections.controls} config={config} onChangeConfig={onChangeConfig} />
          </section>

          {/* 5. Marca Blanca y SEO */}
          <section>
            <button
              type="button"
              aria-expanded={openSections.branding}
              onClick={() => onToggleSection('branding')}
              className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/40 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-cyan-400"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-100">
                <i className="fa-solid fa-shield-halved text-cyan-400 w-4 text-center" aria-hidden="true" />
                <span>Marca Blanca y SEO</span>
              </span>
              <i
                className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200 ${
                  openSections.branding ? 'rotate-180 text-cyan-400' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <BrandingSection open={openSections.branding} config={config} onChangeConfig={onChangeConfig} />
          </section>
        </div>

        {/* Sidebar Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 truncate"
          >
            <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" aria-hidden="true" />
            <span>unfantasmaenelsistema.com</span>
          </a>
          <button
            type="button"
            onClick={onResetConfig}
            className="px-2 py-1 rounded border border-slate-800 bg-slate-950/70 text-[11px] font-mono text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors flex items-center gap-1.5 shrink-0"
            title="Restablecer ajustes de diseño, controles y marca blanca"
          >
            <i className="fa-solid fa-rotate-left text-[10px]" aria-hidden="true" />
            <span>Restablecer</span>
          </button>
        </div>
      </aside>
    </>
  );
};
