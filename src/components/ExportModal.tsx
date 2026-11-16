import React, { useEffect, useState } from 'react';
import type { BookConfig, FlipbookPage, HotspotItem, UploadedDocument } from '../types/flipbook';
import { exportFlipbookZip, exportStandaloneFlipbook } from '../utils/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BookConfig;
  pages: FlipbookPage[];
  hotspots: HotspotItem[];
  uploadedDoc: UploadedDocument | null;
}

function toSafeSlug(raw: string): string {
  const cleaned = raw
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'revista_interactiva';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  config,
  pages,
  hotspots,
  uploadedDoc,
}) => {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [exportMode, setExportMode] = useState<'zip' | 'html' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [fileBaseName, setFileBaseName] = useState('revista_interactiva');
  const [exportedInfo, setExportedInfo] = useState<{
    filename: string;
    sizeKb: string;
    pageImagesCount: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setExportError(null);
    setExportedInfo(null);
    const defaultBase = uploadedDoc?.name
      ? toSafeSlug(uploadedDoc.name)
      : 'revista_interactiva';
    setFileBaseName(defaultBase);
  }, [isOpen, uploadedDoc?.name]);

  if (!isOpen) return null;

  const normalizedBase = toSafeSlug(fileBaseName);

  const handleDownloadZip = async () => {
    setExportMode('zip');
    setExportError(null);
    const outName = `${normalizedBase}.zip`;
    try {
      const result = await exportFlipbookZip(
        config,
        pages,
        uploadedDoc,
        hotspots,
        outName,
      );
      setExportedInfo({
        filename: outName,
        sizeKb: (result.bytes / 1024).toFixed(1),
        pageImagesCount: result.pageImagesCount,
      });
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'No se pudo generar el paquete ZIP.',
      );
    } finally {
      setExportMode(null);
    }
  };

  const handleDownloadStandaloneHtml = async () => {
    setExportMode('html');
    setExportError(null);
    const outName = `${normalizedBase}.html`;
    try {
      const bytes = await exportStandaloneFlipbook(
        config,
        pages,
        uploadedDoc,
        outName,
        hotspots,
      );
      setExportedInfo({
        filename: outName,
        sizeKb: (bytes / 1024).toFixed(1),
        pageImagesCount: pages.filter((p) => Boolean(p.imageDataUrl)).length,
      });
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'No se pudo generar el archivo HTML.',
      );
    } finally {
      setExportMode(null);
    }
  };

  const embedSnippet = `<iframe src="./index.html" width="100%" height="${config.height + 120}" style="border:0;border-radius:12px;" allowfullscreen loading="lazy"></iframe>`;

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopiedSnippet(true);
      window.setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      // Fallback ignored if clipboard permissions are restricted
    }
  };

  const isBusy = exportMode !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <i className="fa-solid fa-file-zipper text-cyan-400" aria-hidden="true" />
            <h2 id="export-modal-title" className="font-display text-lg font-semibold text-white">
              Exportar Publicación
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-md transition-colors"
            aria-label="Cerrar ventana"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Descarga el <span className="font-mono text-cyan-300">paquete ZIP</span> optimizado con recursos en <span className="font-mono text-cyan-300">assets/</span> para GitHub Pages, o genera un <span className="font-mono text-emerald-300">HTML único</span> autocontenido.
          </p>

          <div>
            <label htmlFor="export-filename-input" className="block text-xs font-medium text-slate-300 mb-1.5">
              Nombre del archivo exportado
            </label>
            <div className="flex items-center gap-2">
              <input
                id="export-filename-input"
                type="text"
                value={fileBaseName}
                onChange={(e) => setFileBaseName(e.target.value)}
                placeholder="revista_interactiva"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
              <span className="text-xs font-mono text-slate-500">.zip / .html</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-1.5 text-xs font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Estructura del ZIP</span>
              <span className="text-cyan-300">index.html + assets/</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Dimensiones</span>
              <span>
                {config.width} × {config.height} px
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Encuadernación · Velocidad</span>
              <span>
                {config.coverType === 'hard' ? 'Tapa Dura' : 'Tapa Blanda'} · {config.flippingTime} ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Páginas · Recursos</span>
              <span>
                {pages.length} págs · Logo + WAV
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hotspots (enlaces)</span>
              <span className={hotspots.length > 0 ? 'text-cyan-300' : 'text-slate-400'}>
                {hotspots.length} {hotspots.length === 1 ? 'área interactiva' : 'áreas interactivas'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Modo Lectura (carrusel)</span>
              <span className={config.autoplay ? 'text-emerald-400' : 'text-slate-400'}>
                {config.autoplay
                  ? `Activo · ${Math.max(1, Math.round(config.autoplayIntervalMs / 1000))}s`
                  : `Manual (${Math.max(1, Math.round(config.autoplayIntervalMs / 1000))}s)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Protección con clave</span>
              <span className={config.passwordProtected && config.passwordValue ? 'text-emerald-400' : 'text-slate-400'}>
                {config.passwordProtected && config.passwordValue ? 'Activada (hash cliente)' : 'Desactivada'}
              </span>
            </div>
          </div>

          {exportError && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-xs text-rose-300 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation shrink-0" aria-hidden="true" />
              <span>{exportError}</span>
            </div>
          )}

          {exportedInfo && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-300 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 truncate">
                <i className="fa-solid fa-circle-check shrink-0" aria-hidden="true" />
                <span className="truncate">
                  Descargado: {exportedInfo.filename}
                  {exportedInfo.pageImagesCount > 0 ? ` (${exportedInfo.pageImagesCount} págs)` : ''}
                </span>
              </span>
              <span className="font-mono shrink-0">{exportedInfo.sizeKb} KB</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-300">Código iframe tras descomprimir</span>
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <i
                  className={`fa-solid ${copiedSnippet ? 'fa-check' : 'fa-copy'}`}
                  aria-hidden="true"
                />
                <span>{copiedSnippet ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto">
              <code>{embedSnippet}</code>
            </pre>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
          <a
            href="/ghostflip-fase1.html"
            download="ghostflip-studio.html"
            className="text-xs text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-code" aria-hidden="true" />
            <span>Plantilla HTML</span>
          </a>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleDownloadStandaloneHtml}
              disabled={isBusy}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              title="Descargar visor en un único archivo HTML autocontenido"
            >
              <i
                className={`fa-solid ${exportMode === 'html' ? 'fa-spinner fa-spin' : 'fa-file-code'}`}
                aria-hidden="true"
              />
              <span>{exportMode === 'html' ? 'Generando...' : 'HTML Único'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isBusy}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              title="Descargar paquete ZIP optimizado para hosting"
            >
              <i
                className={`fa-solid ${exportMode === 'zip' ? 'fa-spinner fa-spin' : 'fa-file-zipper'}`}
                aria-hidden="true"
              />
              <span>{exportMode === 'zip' ? 'Comprimiendo...' : 'Descargar ZIP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
