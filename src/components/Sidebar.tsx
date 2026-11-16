import React, { useRef, useState } from 'react';
import type {
  AccordionSectionId,
  BookConfig,
  CoverType,
  ParseProgress,
  UploadedDocument,
} from '../types/flipbook';
import { playPageFlipSound } from '../utils/sound';

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
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [remotePdfUrl, setRemotePdfUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  const bgImgInputRef = useRef<HTMLInputElement>(null);
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

  const validateAndLoadFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'html', 'htm', 'pptx'].includes(ext)) {
      setUploadError('Formato no compatible. Usa PDF, HTML o PPTX.');
      return;
    }
    setUploadError(null);
    onFileUpload(file);
  };

  const handleRemoteUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseProgress?.active) return;
    const trimmed = remotePdfUrl.trim();
    if (!trimmed) {
      setUploadError('Introduce la URL pública de un archivo PDF.');
      return;
    }
    setUploadError(null);
    onRemotePdfLoad(trimmed);
  };

  const handleDocDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingDoc(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndLoadFile(file);
  };

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

  const renderToggle = (
    id: string,
    label: string,
    checked: boolean,
    onToggle: (next: boolean) => void,
    iconClass: string,
    description?: string,
  ) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer select-none min-w-0">
        <i className={`${iconClass} text-cyan-400/90 mt-0.5 w-4 text-center text-xs shrink-0`} aria-hidden="true" />
        <div className="min-w-0">
          <span className="block text-sm font-medium text-slate-200 leading-tight">{label}</span>
          {description && (
            <span className="block text-xs text-slate-400 mt-0.5 leading-snug">{description}</span>
          )}
        </div>
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onToggle(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
          checked
            ? 'bg-emerald-500/90 border-emerald-400'
            : 'bg-slate-800 border-slate-700 hover:border-slate-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const displayedError = uploadError ?? parseError;

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
                src="/assets/aistudio/icono_81a3db5b.png"
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

            {openSections.upload && (
              <div className="px-5 pb-5 pt-1 space-y-3">
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.html,.htm,.pptx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) validateAndLoadFile(file);
                    e.target.value = '';
                  }}
                />

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !parseProgress?.active && docInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !parseProgress?.active) {
                      e.preventDefault();
                      docInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!parseProgress?.active) setIsDraggingDoc(true);
                  }}
                  onDragLeave={() => setIsDraggingDoc(false)}
                  onDrop={handleDocDrop}
                  className={`rounded-lg border border-dashed p-4 text-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    isDraggingDoc
                      ? 'border-cyan-400 bg-cyan-950/30'
                      : 'border-slate-700 bg-slate-950/50 hover:border-cyan-500/60 hover:bg-slate-950/80'
                  } ${parseProgress?.active ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <i
                    className={`fa-solid fa-cloud-arrow-up text-2xl mb-2 block ${
                      isDraggingDoc ? 'text-cyan-300' : 'text-cyan-400'
                    }`}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-slate-200">
                    Arrastra tu documento aquí
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    O haz clic para seleccionar
                  </p>
                  <p className="text-xs font-mono text-slate-500 mt-2">
                    PDF · HTML · PPTX
                  </p>
                </div>

                {/* Remote Public PDF URL Input */}
                <form onSubmit={handleRemoteUrlSubmit} className="space-y-1.5 pt-1">
                  <label
                    htmlFor="remote-pdf-url"
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-300"
                  >
                    <i className="fa-solid fa-globe text-cyan-400 text-[11px]" aria-hidden="true" />
                    <span>O cargar PDF desde URL pública</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="remote-pdf-url"
                      type="text"
                      inputMode="url"
                      placeholder="https://ejemplo.com/revista.pdf"
                      value={remotePdfUrl}
                      disabled={Boolean(parseProgress?.active)}
                      onChange={(e) => {
                        setRemotePdfUrl(e.target.value);
                        if (uploadError) setUploadError(null);
                      }}
                      className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={Boolean(parseProgress?.active) || !remotePdfUrl.trim()}
                      className="px-3 py-2 rounded-md border border-cyan-500/40 bg-cyan-500/15 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-45 disabled:pointer-events-none transition-colors shrink-0 flex items-center gap-1.5 whitespace-nowrap"
                      title="Descargar y procesar PDF remoto"
                    >
                      <i className="fa-solid fa-cloud-arrow-down text-[11px]" aria-hidden="true" />
                      <span>Cargar</span>
                    </button>
                  </div>
                </form>

                {parseProgress?.active && (
                  <div className="rounded-lg border border-cyan-500/30 bg-slate-950/90 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-cyan-300 font-medium truncate">
                        {parseProgress.statusText}
                      </span>
                      <span className="font-mono text-slate-300 shrink-0">
                        {parseProgress.percent}%
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={parseProgress.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-2 w-full rounded-full bg-slate-800 overflow-hidden"
                    >
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-200"
                        style={{ width: `${parseProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {displayedError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-exclamation shrink-0" aria-hidden="true" />
                    <span>{displayedError}</span>
                  </p>
                )}

                {uploadedDoc ? (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-emerald-400 truncate">
                          {uploadedDoc.name}
                        </p>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          {uploadedDoc.format} · {formatBytes(uploadedDoc.sizeBytes)} · {uploadedDoc.pageCount} págs
                        </p>
                        {uploadedDoc.sourceUrl && (
                          <p
                            className="text-[11px] font-mono text-cyan-400/90 truncate mt-0.5"
                            title={uploadedDoc.sourceUrl}
                          >
                            URL: {uploadedDoc.sourceUrl}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={onClearDocument}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors shrink-0 rounded focus-visible:outline-2 focus-visible:outline-cyan-400"
                        title="Quitar documento y restaurar muestra"
                        aria-label="Quitar documento"
                      >
                        <i className="fa-solid fa-trash-can text-xs" aria-hidden="true" />
                      </button>
                    </div>
                    {uploadedDoc.notice && (
                      <p className="text-[11px] text-amber-300/90 leading-snug pt-1 border-t border-slate-800/80">
                        {uploadedDoc.notice}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Vista previa cargada con edición de muestra. Arrastra un archivo o pega la URL de un PDF público para procesarlo.
                  </p>
                )}
              </div>
            )}
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

            {openSections.book && (
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
            )}
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

            {openSections.appearance && (
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
            )}
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

            {openSections.controls && (
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
            )}
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

            {openSections.branding && (
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
                    {config.brandLogo !== '/assets/aistudio/icono_81a3db5b.png' && (
                      <button
                        type="button"
                        onClick={() =>
                          onChangeConfig({ brandLogo: '/assets/aistudio/icono_81a3db5b.png' })
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
            )}
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
