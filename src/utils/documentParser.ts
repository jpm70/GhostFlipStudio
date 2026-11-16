import type {
  DocumentFormat,
  DocumentReadyEventDetail,
  FlipbookPage,
  ParseProgress,
} from '../types/flipbook';

interface PdfJsViewport {
  width: number;
  height: number;
}

interface PdfJsPage {
  getViewport: (options: { scale: number }) => PdfJsViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfJsViewport;
  }) => { promise: Promise<void> };
}

interface PdfJsDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PdfJsPage>;
}

interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (params: {
    data: ArrayBuffer;
    disableWorker?: boolean;
  }) => { promise: Promise<PdfJsDocument> };
}

interface JsZipFileEntry {
  dir: boolean;
  async: (type: 'base64' | 'string') => Promise<string>;
}

interface JsZipInstance {
  files: Record<string, JsZipFileEntry>;
  folder: (name: string) => JsZipInstance | null;
  file: (name: string, data: Blob | string) => JsZipInstance;
  generateAsync: (options: {
    type: 'blob';
    compression?: 'STORE' | 'DEFLATE';
    compressionOptions?: { level: number };
  }) => Promise<Blob>;
}

interface JsZipStatic {
  new (): JsZipInstance;
  loadAsync: (data: ArrayBuffer) => Promise<JsZipInstance>;
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
    JSZip?: JsZipStatic;
    saveAs?: (data: Blob | string, filename?: string) => void;
    flipbookPages?: string[];
  }
}

const PDF_WORKER_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function getMimeFromFilename(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return null;
  }
}

export class DocumentParser {
  private onProgress?: (progress: ParseProgress) => void;

  constructor(onProgress?: (progress: ParseProgress) => void) {
    this.onProgress = onProgress;
    if (typeof window !== 'undefined' && !Array.isArray(window.flipbookPages)) {
      window.flipbookPages = [];
    }
  }

  private emitProgress(progress: ParseProgress): void {
    this.onProgress?.(progress);
  }

  private emitDocumentReady(detail: DocumentReadyEventDetail): void {
    if (typeof window === 'undefined') return;
    window.flipbookPages = detail.pages;
    const event = new CustomEvent<DocumentReadyEventDetail>('documentReady', {
      detail,
      bubbles: true,
    });
    window.dispatchEvent(event);
    document.dispatchEvent(event);
  }

  public async parseFile(file: File): Promise<DocumentReadyEventDetail> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    let format: DocumentFormat = 'PDF';
    if (ext === 'html' || ext === 'htm') format = 'HTML';
    else if (ext === 'pptx') format = 'PPTX';
    else if (ext !== 'pdf') {
      throw new Error('Formato no soportado. Selecciona un archivo PDF, HTML o PPTX.');
    }

    if (format === 'PDF') {
      return this.parsePdf(file);
    }
    if (format === 'PPTX') {
      return this.parsePptx(file);
    }
    return this.parseHtml(file);
  }

  public async parseRemotePdf(rawUrl: string): Promise<DocumentReadyEventDetail> {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      throw new Error('Introduce la URL de un PDF público.');
    }

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(withProtocol);
    } catch {
      throw new Error('La URL introducida no tiene un formato válido.');
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Solo se admiten URLs públicas http:// o https://.');
    }

    const fallbackName = (() => {
      const seg = parsedUrl.pathname.split('/').filter(Boolean).pop();
      if (!seg) return 'documento_remoto.pdf';
      return seg.toLowerCase().endsWith('.pdf') ? seg : `${seg}.pdf`;
    })();

    this.emitProgress({
      active: true,
      fileName: fallbackName,
      format: 'PDF',
      current: 0,
      total: 1,
      percent: 4,
      statusText: `Descargando PDF remoto desde ${parsedUrl.hostname}...`,
    });

    let arrayBuffer: ArrayBuffer | null = null;
    let resolvedFileName = fallbackName;

    // 1. Try server-side remote PDF proxy (/api/remote-pdf) to avoid CORS restrictions
    try {
      const proxyRes = await fetch(
        `/api/remote-pdf?url=${encodeURIComponent(parsedUrl.toString())}`,
      );
      const contentType = proxyRes.headers.get('content-type') || '';

      if (proxyRes.ok && contentType.includes('application/pdf')) {
        const headerName = proxyRes.headers.get('x-resolved-filename');
        if (headerName) {
          try {
            resolvedFileName = decodeURIComponent(headerName);
          } catch {
            resolvedFileName = headerName;
          }
        }
        arrayBuffer = await proxyRes.arrayBuffer();
      } else if (contentType.includes('application/json')) {
        const errPayload = (await proxyRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(
          errPayload?.error || `No se pudo descargar el PDF remoto (HTTP ${proxyRes.status}).`,
        );
      }
    } catch (err) {
      // Re-throw explicit proxy validation/upstream errors, otherwise fall back to direct CORS fetch
      if (
        err instanceof Error &&
        !err.message.includes('Failed to fetch') &&
        !err.message.includes('NetworkError')
      ) {
        throw err;
      }
    }

    // 2. Fallback to direct client-side CORS fetch if static deployment has no /api/remote-pdf route
    if (!arrayBuffer) {
      let directRes: Response;
      try {
        directRes = await fetch(parsedUrl.toString(), { mode: 'cors' });
      } catch {
        throw new Error(
          'No se pudo descargar el PDF remoto (el servidor bloquea CORS o no es accesible).',
        );
      }
      if (!directRes.ok) {
        throw new Error(`El servidor remoto devolvió HTTP ${directRes.status}.`);
      }
      arrayBuffer = await directRes.arrayBuffer();
    }

    const probeText = new TextDecoder('latin1').decode(
      new Uint8Array(arrayBuffer.slice(0, 1024)),
    );
    if (!probeText.includes('%PDF-')) {
      throw new Error('El recurso remoto no contiene un documento PDF válido.');
    }

    return this.parsePdfBuffer(
      arrayBuffer,
      resolvedFileName,
      `Procesado remotamente desde ${parsedUrl.hostname}.`,
      arrayBuffer.byteLength,
      parsedUrl.toString(),
    );
  }

  private async parsePdf(file: File): Promise<DocumentReadyEventDetail> {
    this.emitProgress({
      active: true,
      fileName: file.name,
      format: 'PDF',
      current: 0,
      total: 1,
      percent: 5,
      statusText: 'Cargando estructura del PDF...',
    });

    const arrayBuffer = await file.arrayBuffer();
    return this.parsePdfBuffer(arrayBuffer, file.name, undefined, file.size);
  }

  private async parsePdfBuffer(
    arrayBuffer: ArrayBuffer,
    fileName: string,
    notice?: string,
    sizeBytes?: number,
    sourceUrl?: string,
  ): Promise<DocumentReadyEventDetail> {
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      throw new Error('La librería pdf.js no está disponible. Verifica tu conexión al CDN.');
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

    this.emitProgress({
      active: true,
      fileName,
      format: 'PDF',
      current: 0,
      total: 1,
      percent: 8,
      statusText: 'Analizando páginas del PDF...',
    });

    let pdfDoc: PdfJsDocument;

    try {
      pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } catch {
      // Retry without Web Worker if sandbox CSP blocks external worker script
      pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
    }

    const totalPages = pdfDoc.numPages;
    const base64Pages: string[] = [];
    const structuredPages: FlipbookPage[] = [];

    // Hidden offscreen canvas element reused across PDF pages
    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.style.display = 'none';
    const ctx = hiddenCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto 2D del canvas.');
    }

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      this.emitProgress({
        active: true,
        fileName,
        format: 'PDF',
        current: pageNum,
        total: totalPages,
        percent: Math.round(((pageNum - 0.5) / totalPages) * 100),
        statusText: `Renderizando página ${pageNum} de ${totalPages}...`,
      });

      const page = await pdfDoc.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const targetScale = Math.min(2.0, Math.max(1.2, 1100 / baseViewport.width));
      const viewport = page.getViewport({ scale: targetScale });

      hiddenCanvas.width = Math.floor(viewport.width);
      hiddenCanvas.height = Math.floor(viewport.height);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      const dataUrl = hiddenCanvas.toDataURL('image/jpeg', 0.9);
      base64Pages.push(dataUrl);

      structuredPages.push({
        id: pageNum,
        label: `PÁGINA ${String(pageNum).padStart(2, '0')}`,
        title: fileName.replace(/\.[^/.]+$/, ''),
        body: `Página ${pageNum} de ${totalPages} renderizada desde PDF.`,
        imageDataUrl: dataUrl,
        isCover: pageNum === 1,
        isBackCover: pageNum === totalPages && totalPages > 1,
      });

      this.emitProgress({
        active: true,
        fileName,
        format: 'PDF',
        current: pageNum,
        total: totalPages,
        percent: Math.round((pageNum / totalPages) * 100),
        statusText: `Página ${pageNum} de ${totalPages} extraída`,
      });
    }

    const detail: DocumentReadyEventDetail = {
      fileName,
      format: 'PDF',
      pages: base64Pages,
      structuredPages,
      notice,
      sizeBytes: sizeBytes ?? arrayBuffer.byteLength,
      sourceUrl,
    };

    this.emitDocumentReady(detail);
    return detail;
  }

  private async parsePptx(file: File): Promise<DocumentReadyEventDetail> {
    const JSZip = window.JSZip;
    if (!JSZip) {
      throw new Error('La librería JSZip no está disponible. Verifica tu conexión al CDN.');
    }

    this.emitProgress({
      active: true,
      fileName: file.name,
      format: 'PPTX',
      current: 0,
      total: 1,
      percent: 15,
      statusText: 'Descomprimiendo paquete PPTX...',
    });

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const mediaPaths = Object.keys(zip.files)
      .filter((path) => path.startsWith('ppt/media/') && !zip.files[path].dir)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const slidePaths = Object.keys(zip.files)
      .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const base64Pages: string[] = [];
    const structuredPages: FlipbookPage[] = [];
    let notice: string | undefined;

    if (mediaPaths.length > 0) {
      const validMedia = mediaPaths.filter((p) => getMimeFromFilename(p) !== null);
      const total = validMedia.length;

      for (let i = 0; i < validMedia.length; i++) {
        const path = validMedia[i];
        const mime = getMimeFromFilename(path)!;
        const base64 = await zip.files[path].async('base64');
        const dataUrl = `data:${mime};base64,${base64}`;
        base64Pages.push(dataUrl);

        structuredPages.push({
          id: i + 1,
          label: `MEDIA ${String(i + 1).padStart(2, '0')}`,
          title: path.split('/').pop() ?? `Imagen ${i + 1}`,
          body: `Imagen incrustada extraída de ${file.name}.`,
          imageDataUrl: dataUrl,
          isCover: i === 0,
          isBackCover: i === validMedia.length - 1 && validMedia.length > 1,
        });

        this.emitProgress({
          active: true,
          fileName: file.name,
          format: 'PPTX',
          current: i + 1,
          total,
          percent: Math.round(((i + 1) / total) * 100),
          statusText: `Extrayendo recurso ${i + 1} de ${total}...`,
        });
      }
      notice = `Se extrajeron ${validMedia.length} imágenes incrustadas desde ppt/media/.`;
    }

    // Visual fallback when PPTX has XML slides without embedded raster media
    if (base64Pages.length === 0) {
      const totalSlides = Math.max(1, slidePaths.length);
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 960;
      fallbackCanvas.height = 680;
      const ctx = fallbackCanvas.getContext('2d');

      for (let i = 0; i < totalSlides; i++) {
        let slideText = 'Diapositiva sin imágenes incrustadas en ppt/media/.';
        if (slidePaths[i]) {
          const xml = await zip.files[slidePaths[i]].async('string');
          const matches = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g))
            .map((m) => m[1].trim())
            .filter(Boolean);
          if (matches.length > 0) {
            slideText = matches.join(' · ').slice(0, 320);
          }
        }

        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 4;
          ctx.strokeRect(24, 24, fallbackCanvas.width - 48, fallbackCanvas.height - 48);

          ctx.fillStyle = '#22d3ee';
          ctx.font = '600 22px monospace';
          ctx.fillText(`PPTX FALLBACK · DIAPOSITIVA ${i + 1}/${totalSlides}`, 56, 86);

          ctx.fillStyle = '#f8fafc';
          ctx.font = '700 34px sans-serif';
          ctx.fillText(file.name, 56, 150);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '400 22px sans-serif';
          const words = slideText.split(' ');
          let line = '';
          let y = 220;
          for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > 820) {
              ctx.fillText(line, 56, y);
              line = word + ' ';
              y += 34;
              if (y > 590) break;
            } else {
              line = testLine;
            }
          }
          if (line && y <= 590) ctx.fillText(line, 56, y);
        }

        const dataUrl = fallbackCanvas.toDataURL('image/png');
        base64Pages.push(dataUrl);
        structuredPages.push({
          id: i + 1,
          label: `DIAPOSITIVA ${String(i + 1).padStart(2, '0')}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          body: slideText,
          imageDataUrl: dataUrl,
          isCover: i === 0,
          isBackCover: i === totalSlides - 1 && totalSlides > 1,
        });

        this.emitProgress({
          active: true,
          fileName: file.name,
          format: 'PPTX',
          current: i + 1,
          total: totalSlides,
          percent: Math.round(((i + 1) / totalSlides) * 100),
          statusText: `Generando fallback visual ${i + 1} de ${totalSlides}...`,
        });
      }

      notice =
        'Este PPTX no contiene imágenes rasterizadas en ppt/media/. Se generó un fallback visual con el texto XML de las diapositivas.';
    }

    const detail: DocumentReadyEventDetail = {
      fileName: file.name,
      format: 'PPTX',
      pages: base64Pages,
      structuredPages,
      notice,
    };

    this.emitDocumentReady(detail);
    return detail;
  }

  private async parseHtml(file: File): Promise<DocumentReadyEventDetail> {
    this.emitProgress({
      active: true,
      fileName: file.name,
      format: 'HTML',
      current: 1,
      total: 2,
      percent: 45,
      statusText: 'Analizando DOM del archivo HTML...',
    });

    const rawHtml = await file.text();
    const parser = new DOMParser();
    const parsed = parser.parseFromString(rawHtml, 'text/html');
    const blocks = Array.from(parsed.querySelectorAll('h1, h2, h3, p, section'))
      .map((el) => el.textContent?.trim() ?? '')
      .filter((txt) => txt.length > 20)
      .slice(0, 8);

    const structuredPages: FlipbookPage[] = [
      {
        id: 1,
        label: 'DOCUMENTO HTML',
        title: parsed.title || file.name.replace(/\.[^/.]+$/, ''),
        subtitle: file.name,
        body: 'Documento HTML procesado directamente en el navegador.',
        isCover: true,
      },
    ];

    blocks.forEach((txt, idx) => {
      structuredPages.push({
        id: idx + 2,
        label: `SECCIÓN ${String(idx + 1).padStart(2, '0')}`,
        title: `Bloque HTML #${idx + 1}`,
        body: txt.length > 380 ? `${txt.slice(0, 377)}...` : txt,
      });
    });

    structuredPages.push({
      id: structuredPages.length + 1,
      label: 'CONTRAPORTADA',
      title: 'GhostFlip Studio',
      body: 'Procesamiento estático completado en cliente.',
      isBackCover: true,
    });

    this.emitProgress({
      active: true,
      fileName: file.name,
      format: 'HTML',
      current: 2,
      total: 2,
      percent: 100,
      statusText: 'Documento HTML listo',
    });

    const detail: DocumentReadyEventDetail = {
      fileName: file.name,
      format: 'HTML',
      pages: [],
      structuredPages,
    };

    this.emitDocumentReady(detail);
    return detail;
  }
}
