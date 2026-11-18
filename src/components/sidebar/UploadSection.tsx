import React, { useRef, useState } from 'react';
import type { ParseProgress, UploadedDocument } from '../../types/flipbook';
import { formatBytes } from './presets';

interface UploadSectionProps {
  open: boolean;
  uploadedDoc: UploadedDocument | null;
  parseProgress: ParseProgress | null;
  parseError: string | null;
  onFileUpload: (file: File) => void;
  onRemotePdfLoad: (url: string) => void;
  onClearDocument: () => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ open, uploadedDoc, parseProgress, parseError, onFileUpload, onRemotePdfLoad, onClearDocument }) => {
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [remotePdfUrl, setRemotePdfUrl] = useState('');
  const docInputRef = useRef<HTMLInputElement>(null);

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
  const displayedError = uploadError ?? parseError;

  if (!open) return null;

  return (
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
  );
};
