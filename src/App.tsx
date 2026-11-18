import { useEffect, useMemo, useRef, useState } from 'react';
import { ExportModal } from './components/ExportModal';
import { FlipbookStage } from './components/FlipbookStage';
import { Sidebar } from './components/Sidebar';
import type {
  AccordionSectionId,
  BookConfig,
  DocumentReadyEventDetail,
  FlipbookPage,
  HotspotItem,
  ParseProgress,
  UploadedDocument,
} from './types/flipbook';
import { DocumentParser } from './utils/documentParser';
import { DEFAULT_LOGO, LEGACY_LOGO } from './utils/assets';

const INITIAL_CONFIG: BookConfig = {
  width: 840,
  height: 580,
  coverType: 'hard',
  flippingTime: 700,
  bgColor: '#020617',
  bgImage: null,
  bgOverlayOpacity: 45,
  dynamicShadows: true,
  shadowIntensity: 70,
  soundEnabled: true,
  autoplay: false,
  autoplayIntervalMs: 5000,
  zoomEnabled: true,
  zoomLevel: 100,
  brandLogo: DEFAULT_LOGO,
  brandLogoPosition: 'top-left',
  brandUrl: 'https://www.unfantasmaenelsistema.com/',
  seoTitle: 'Mi Revista Interactiva 3D — GhostFlip',
  seoDescription: 'Publicación digital interactiva en 3D generada con GhostFlip Studio.',
  seoKeywords: 'flipbook, revista digital, pdf interactivo, ghostflip',
  passwordProtected: false,
  passwordValue: '',
};

const DEFAULT_DEMO_PAGES: FlipbookPage[] = [
  {
    id: 1,
    label: 'EDICIÓN DIGITAL · MUESTRA',
    title: 'GhostFlip Studio',
    subtitle: 'Publicación interactiva 3D en tu navegador',
    body: 'Arrastra un documento PDF, HTML o PPTX en el panel izquierdo para convertirlo en una revista interactiva lista para GitHub Pages.',
    isCover: true,
  },
  {
    id: 2,
    label: 'PÁGINA DE MUESTRA 02',
    title: 'Motor PDF local',
    subtitle: 'Renderizado privado en el cliente',
    body: 'Cada página del documento se procesa localmente en el navegador sin enviar archivos a servidores externos, conservando nitidez y proporciones.',
  },
  {
    id: 3,
    label: 'PÁGINA DE MUESTRA 03',
    title: 'Soporte PPTX y HTML',
    subtitle: 'Extracción rápida de recursos',
    body: 'Descomprime presentaciones en memoria para extraer imágenes incrustadas o renderizar tarjetas visuales de forma inmediata.',
  },
  {
    id: 4,
    label: 'PÁGINA DE MUESTRA 04',
    title: 'Encuadernación Configurable',
    subtitle: 'Tapa Dura vs. Tapa Blanda',
    body: 'Personaliza dimensiones, color o imagen de fondo, sombras dinámicas y velocidad de pasada en tiempo real desde el panel lateral.',
  },
  {
    id: 5,
    label: 'PÁGINA DE MUESTRA 05',
    title: 'Hotspots y Marca Blanca',
    subtitle: 'Enlaces clicables y exportación ZIP',
    body: 'Dibuja zonas interactivas con URLs sobre cualquier página, añade tu logotipo corporativo y exporta el paquete estático completo.',
  },
  {
    id: 6,
    label: 'CONTRAPORTADA',
    title: 'Un Fantasma en el Sistema',
    subtitle: 'unfantasmaenelsistema.com',
    body: 'Diseñado para publicaciones técnicas, catálogos, portafolios y documentación digital interactiva.',
    isBackCover: true,
  },
];

const CONFIG_STORAGE_KEY = 'ghostflip_studio_config_v1';

function loadPersistedConfig(): BookConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return INITIAL_CONFIG;
    const parsed = JSON.parse(raw) as Partial<BookConfig>;
    const merged = { ...INITIAL_CONFIG, ...parsed };
    if (merged.brandLogo === LEGACY_LOGO) merged.brandLogo = DEFAULT_LOGO;
    return merged;
  } catch {
    return INITIAL_CONFIG;
  }
}

export default function App() {
  const [config, setConfig] = useState<BookConfig>(() => loadPersistedConfig());
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(null);
  const [customPages, setCustomPages] = useState<FlipbookPage[] | null>(null);
  const [parseProgress, setParseProgress] = useState<ParseProgress | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<AccordionSectionId, boolean>>({
    upload: true,
    book: true,
    appearance: false,
    controls: false,
    branding: false,
  });

  const pendingFileMetaRef = useRef<{ sizeBytes: number; lastModified: number } | null>(null);

  useEffect(() => {
    window.hotspotsData = hotspots;
  }, [hotspots]);

  useEffect(() => {
    const handleDocumentReady = (e: Event) => {
      const customEvent = e as CustomEvent<DocumentReadyEventDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      const meta = pendingFileMetaRef.current;

      const applyDocument = () => {
        setUploadedDoc({
          name: detail.fileName,
          sizeBytes: detail.sizeBytes ?? meta?.sizeBytes ?? 0,
          format: detail.format,
          lastModified: meta?.lastModified ?? Date.now(),
          pageCount: detail.structuredPages.length,
          notice: detail.notice,
          sourceUrl: detail.sourceUrl,
        });
        setCustomPages(detail.structuredPages);
        setHotspots([]);
        setParseProgress(null);
        setParseError(null);
      };

      const firstPageSrc = detail.pages?.[0];
      if (firstPageSrc) {
        const probe = new Image();
        probe.onload = () => {
          if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
            const aspect = probe.naturalHeight / probe.naturalWidth;
            const singlePageW = aspect > 1.1 ? 390 : aspect < 0.8 ? 460 : 420;
            const nextHeight = Math.min(720, Math.max(360, Math.round(singlePageW * aspect)));
            const nextWidth = singlePageW * 2;
            setConfig((prev) => ({
              ...prev,
              width: nextWidth,
              height: nextHeight,
            }));
          }
          applyDocument();
        };
        probe.onerror = () => applyDocument();
        probe.src = firstPageSrc;
      } else {
        applyDocument();
      }
    };

    window.addEventListener('documentReady', handleDocumentReady);
    return () => window.removeEventListener('documentReady', handleDocumentReady);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Gracefully ignore localStorage quota errors when large DataURL images are attached
    }
  }, [config]);

  const handleChangeConfig = (patch: Partial<BookConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleResetConfig = () => {
    try {
      window.localStorage.removeItem(CONFIG_STORAGE_KEY);
    } catch {
      // Ignore storage access restrictions
    }
    setConfig(INITIAL_CONFIG);
  };

  const handleToggleSection = (id: AccordionSectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFileUpload = async (file: File) => {
    setParseError(null);
    pendingFileMetaRef.current = {
      sizeBytes: file.size,
      lastModified: file.lastModified,
    };

    const parser = new DocumentParser((progress) => {
      setParseProgress(progress);
    });

    try {
      await parser.parseFile(file);
    } catch (err) {
      setParseProgress(null);
      setParseError(
        err instanceof Error
          ? err.message
          : 'No se pudo procesar el archivo seleccionado.',
      );
    }
  };

  const handleRemotePdfLoad = async (url: string) => {
    setParseError(null);
    pendingFileMetaRef.current = null;

    const parser = new DocumentParser((progress) => {
      setParseProgress(progress);
    });

    try {
      await parser.parseRemotePdf(url);
    } catch (err) {
      setParseProgress(null);
      setParseError(
        err instanceof Error
          ? err.message
          : 'No se pudo descargar o procesar el PDF remoto.',
      );
    }
  };

  const handleClearDocument = () => {
    setUploadedDoc(null);
    setCustomPages(null);
    setHotspots([]);
    setParseError(null);
    setParseProgress(null);
    window.flipbookPages = [];
    window.hotspotsData = [];
  };

  const handleAddHotspot = (hotspot: HotspotItem) => {
    setHotspots((prev) => {
      const next = [...prev, hotspot];
      window.hotspotsData = next;
      return next;
    });
  };

  const handleDeleteHotspot = (id: string) => {
    setHotspots((prev) => {
      const next = prev.filter((item) => item.id !== id);
      window.hotspotsData = next;
      return next;
    });
  };

  const activePages = useMemo(
    () => customPages ?? DEFAULT_DEMO_PAGES,
    [customPages],
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 text-slate-100">
      {/* Left Configuration Sidebar (hidden during clean Preview Mode) */}
      {!isPreviewMode && (
        <Sidebar
          config={config}
          onChangeConfig={handleChangeConfig}
          uploadedDoc={uploadedDoc}
          parseProgress={parseProgress}
          parseError={parseError}
          onFileUpload={handleFileUpload}
          onRemotePdfLoad={handleRemotePdfLoad}
          onClearDocument={handleClearDocument}
          onResetConfig={handleResetConfig}
          openSections={openSections}
          onToggleSection={handleToggleSection}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Right Main Canvas */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Toolbar (hidden during clean Preview Mode) */}
        {!isPreviewMode && (
          <header className="h-16 px-4 sm:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden h-10 w-10 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-cyan-400 flex items-center justify-center shrink-0 transition-colors"
                aria-label="Abrir panel de configuración"
              >
                <i className="fa-solid fa-bars" aria-hidden="true" />
              </button>

              <div className="min-w-0">
                <h1 className="font-display text-sm sm:text-base font-semibold text-slate-100 truncate">
                  {uploadedDoc ? uploadedDoc.name : 'Edición de muestra · GhostFlip'}
                </h1>
                <p className="text-xs font-mono text-slate-400 truncate">
                  {config.width} × {config.height} px ·{' '}
                  {config.coverType === 'hard' ? 'Tapa Dura' : 'Tapa Blanda'} ·{' '}
                  {activePages.length} páginas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {config.zoomEnabled && (
                <div
                  role="group"
                  aria-label="Controles de zoom"
                  className="hidden md:flex items-center gap-0.5 px-1.5 py-1 rounded-lg border border-slate-800 bg-slate-950/80"
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleChangeConfig({ zoomLevel: Math.max(60, config.zoomLevel - 10) })
                    }
                    className="h-7 w-7 rounded flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                    aria-label="Alejar zoom"
                    title="Alejar"
                  >
                    <i className="fa-solid fa-magnifying-glass-minus text-xs" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeConfig({ zoomLevel: 100 })}
                    className="px-2 h-7 rounded text-xs font-mono text-cyan-300 hover:bg-slate-800 transition-colors whitespace-nowrap"
                    title="Restablecer zoom al 100%"
                  >
                    {config.zoomLevel}%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleChangeConfig({ zoomLevel: Math.min(150, config.zoomLevel + 10) })
                    }
                    className="h-7 w-7 rounded flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                    aria-label="Acercar zoom"
                    title="Acercar"
                  >
                    <i className="fa-solid fa-magnifying-glass-plus text-xs" aria-hidden="true" />
                  </button>
                </div>
              )}

              <button
                type="button"
                role="switch"
                aria-checked={isLinkEditMode}
                onClick={() => {
                  setIsLinkEditMode((prev) => {
                    const next = !prev;
                    if (next && config.autoplay) {
                      handleChangeConfig({ autoplay: false });
                    }
                    return next;
                  });
                }}
                className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  isLinkEditMode
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                    : 'border-slate-700 bg-slate-950/70 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300'
                }`}
                title="Dibujar áreas clicables con URL sobre las páginas"
              >
                <i className="fa-solid fa-link text-xs" aria-hidden="true" />
                <span className="hidden xl:inline">Modo Edición de Enlaces</span>
                <span className="xl:hidden">Enlaces</span>
                {hotspots.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                    {hotspots.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={config.autoplay}
                onClick={() => {
                  const next = !config.autoplay;
                  if (next) setIsLinkEditMode(false);
                  handleChangeConfig({ autoplay: next });
                }}
                className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  config.autoplay
                    ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700 bg-slate-950/70 text-slate-200 hover:border-emerald-400/60 hover:text-emerald-300'
                }`}
                title="Activar o pausar transición automática tipo carrusel"
              >
                <i
                  className={`fa-solid ${config.autoplay ? 'fa-pause' : 'fa-play'} text-xs`}
                  aria-hidden="true"
                />
                <span>Modo Lectura</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[10px]">
                  {Math.max(1, Math.round(config.autoplayIntervalMs / 1000))}s
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsLinkEditMode(false);
                  setIsPreviewMode(true);
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-950/70 text-xs font-medium text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <i className="fa-solid fa-expand text-xs" aria-hidden="true" />
                <span className="hidden sm:inline">Previsualizar</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportOpen(true)}
                className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <i className="fa-solid fa-file-export text-xs" aria-hidden="true" />
                <span>Exportar</span>
              </button>
            </div>
          </header>
        )}

        {/* Central Flipbook Preview Area */}
        <FlipbookStage
          config={config}
          pages={activePages}
          uploadedDoc={uploadedDoc}
          hotspots={hotspots}
          isLinkEditMode={isLinkEditMode}
          onAddHotspot={handleAddHotspot}
          onDeleteHotspot={handleDeleteHotspot}
          parseProgress={parseProgress}
          isPreviewMode={isPreviewMode}
          onExitPreview={() => setIsPreviewMode(false)}
          onChangeZoom={(nextZoom) => handleChangeConfig({ zoomLevel: nextZoom })}
          onToggleReadingMode={() => {
            const next = !config.autoplay;
            if (next) setIsLinkEditMode(false);
            handleChangeConfig({ autoplay: next });
          }}
          onChangeReadingInterval={(intervalMs) =>
            handleChangeConfig({ autoplayIntervalMs: intervalMs })
          }
        />
      </main>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        config={config}
        pages={activePages}
        hotspots={hotspots}
        uploadedDoc={uploadedDoc}
      />
    </div>
  );
}
