import type { BookConfig, FlipbookPage, HotspotItem, UploadedDocument } from '../../types/flipbook';
import { PAGE_FLIP_AUDIO_BASE64 } from '../sound';
import pageFlipSource from 'page-flip/dist/js/page-flip.browser.js?raw';
import { dataUrlToBlob, resolveSourceToBlob, triggerDownloadBlob } from './blobs';
import { generateStaticFlipbookHtml } from './viewerHtml';

export interface ZipExportResult {
  bytes: number;
  pageImagesCount: number;
  hasLogoAsset: boolean;
  hasAudioAsset: boolean;
}

export async function exportFlipbookZip(
  config: BookConfig,
  pages: FlipbookPage[],
  doc: UploadedDocument | null,
  hotspots: HotspotItem[] = [],
  filename = 'revista_interactiva.zip',
): Promise<ZipExportResult> {
  const JSZipCtor = window.JSZip;
  if (!JSZipCtor) {
    throw new Error('La librería JSZip no está disponible. Recarga la página.');
  }

  const zip = new JSZipCtor();
  const assetsFolder = zip.folder('assets');
  const pagesFolder = assetsFolder?.folder('pages');

  const globalImages = Array.isArray(window.flipbookPages) ? window.flipbookPages : [];
  const relativePages: (string | FlipbookPage)[] = [];
  let pageImagesCount = 0;

  // Convert each Base64 page image to a real Blob under assets/pages/
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const sourceDataUrl = page.imageDataUrl || globalImages[i];
    if (sourceDataUrl && pagesFolder) {
      const parsed = dataUrlToBlob(sourceDataUrl, 'jpg');
      if (parsed) {
        const pageFileName = `page-${i + 1}.${parsed.ext}`;
        pagesFolder.file(pageFileName, parsed.blob);
        relativePages.push(`assets/pages/${pageFileName}`);
        pageImagesCount++;
        continue;
      }
    }
    relativePages.push(page);
  }

  // Pack corporate logo inside assets/
  let logoPath = '';
  let hasLogoAsset = false;
  if (config.brandLogo && assetsFolder) {
    const logoAsset = await resolveSourceToBlob(config.brandLogo, 'png');
    if (logoAsset) {
      const logoFileName = `logo.${logoAsset.ext}`;
      assetsFolder.file(logoFileName, logoAsset.blob);
      logoPath = `assets/${logoFileName}`;
      hasLogoAsset = true;
    }
  }

  // Pack custom background image inside assets/ if present
  let bgImagePath: string | null = config.bgImage;
  if (config.bgImage && assetsFolder) {
    const bgAsset = await resolveSourceToBlob(config.bgImage, 'jpg');
    if (bgAsset) {
      const bgFileName = `background.${bgAsset.ext}`;
      assetsFolder.file(bgFileName, bgAsset.blob);
      bgImagePath = `assets/${bgFileName}`;
    }
  }

  // Pack page-flip audio inside assets/
  let audioPath = '';
  let hasAudioAsset = false;
  if (assetsFolder) {
    const audioAsset = dataUrlToBlob(PAGE_FLIP_AUDIO_BASE64, 'wav');
    if (audioAsset) {
      assetsFolder.file('page-flip.wav', audioAsset.blob);
      audioPath = 'assets/page-flip.wav';
      hasAudioAsset = true;
    }
  }

  if (assetsFolder) assetsFolder.file('page-flip.min.js', pageFlipSource);

  const indexHtml = generateStaticFlipbookHtml(config, pages, doc, hotspots, {
    pageFlipPath: assetsFolder ? 'assets/page-flip.min.js' : undefined,
    serializedPagesOverride: relativePages,
    logoPath,
    audioUri: audioPath || PAGE_FLIP_AUDIO_BASE64,
    bgImagePath,
  });

  zip.file('index.html', indexHtml);

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  triggerDownloadBlob(zipBlob, filename);

  return {
    bytes: zipBlob.size,
    pageImagesCount,
    hasLogoAsset,
    hasAudioAsset,
  };
}

export async function exportStandaloneFlipbook(
  config: BookConfig,
  pages: FlipbookPage[],
  doc: UploadedDocument | null,
  filename = 'mi_revista_interactiva.html',
  hotspots: HotspotItem[] = [],
): Promise<number> {
  const logoAsset = await resolveSourceToBlob(config.brandLogo, 'png');
  let inlinedLogo = config.brandLogo;
  if (logoAsset) {
    inlinedLogo = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : config.brandLogo);
      reader.onerror = () => resolve(config.brandLogo);
      reader.readAsDataURL(logoAsset.blob);
    });
  }

  const html = generateStaticFlipbookHtml(
    { ...config, brandLogo: inlinedLogo },
    pages,
    doc,
    hotspots,
  );
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerDownloadBlob(blob, filename);
  return blob.size;
}
