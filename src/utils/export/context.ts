import type { BookConfig, FlipbookPage, HotspotItem, UploadedDocument } from '../../types/flipbook';
import { PAGE_FLIP_AUDIO_BASE64 } from '../sound';
import pageFlipSource from 'page-flip/dist/js/page-flip.browser.js?raw';
import { escapeHtml } from './escape';
import { ghostflipHash, PASSWORD_ITERATIONS, randomSalt } from './password';

export interface GenerateHtmlOptions {
  serializedPagesOverride?: (string | FlipbookPage)[];
  logoPath?: string;
  audioUri?: string;
  bgImagePath?: string | null;
  /** Ruta relativa del motor page-flip (ZIP). Si falta, se incrusta en el propio HTML. */
  pageFlipPath?: string;
}

/** Valores calculados una sola vez y compartidos por las piezas del visor exportado. */
export interface ViewerContext {
  config: BookConfig;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  hasPassword: boolean;
  passwordSalt: string;
  passwordHash: string;
  brandUrl: string;
  brandLogoPosStyle: string;
  resolvedLogoSrc: string;
  resolvedAudioUri: string;
  resolvedBgImage: string | null;
  serializedPages: string;
  serializedHotspots: string;
  serializedConfig: string;
  safeAudioUri: string;
  pageFlipScriptTag: string;
}

export function buildViewerContext(
  config: BookConfig,
  pages: FlipbookPage[],
  doc: UploadedDocument | null,
  hotspots: HotspotItem[] = [],
  options: GenerateHtmlOptions = {},
): ViewerContext {
  const fallbackTitle = doc ? doc.name.replace(/\.[^/.]+$/, '') : 'Mi Revista Interactiva 3D';
  const seoTitle = config.seoTitle.trim() || fallbackTitle;
  const seoDescription =
    config.seoDescription.trim() ||
    'Publicación digital interactiva en 3D generada con GhostFlip Studio.';
  const seoKeywords = config.seoKeywords.trim() || 'flipbook, revista digital, ghostflip';

  const hasPassword = config.passwordProtected && config.passwordValue.trim().length > 0;
  const passwordSalt = hasPassword ? randomSalt() : '';
  const passwordHash = hasPassword ? ghostflipHash(config.passwordValue, passwordSalt, PASSWORD_ITERATIONS) : '';

  const rawBrandUrl = config.brandUrl.trim();
  const brandUrl = /^https?:\/\//i.test(rawBrandUrl) ? rawBrandUrl : 'https://www.unfantasmaenelsistema.com/';
  const brandLogoPosStyle =
    config.brandLogoPosition === 'top-right' ? 'right: 16px;' : 'left: 16px;';

  const resolvedLogoSrc = options.logoPath !== undefined ? options.logoPath : config.brandLogo;
  const resolvedAudioUri = options.audioUri ?? PAGE_FLIP_AUDIO_BASE64;
  const resolvedBgImage =
    options.bgImagePath !== undefined ? options.bgImagePath : config.bgImage;

  const pagesPayload = options.serializedPagesOverride ?? pages;
  const serializedPages = JSON.stringify(pagesPayload).replace(/</g, '\\u003c');
  const serializedHotspots = JSON.stringify(hotspots).replace(/</g, '\\u003c');
  const serializedConfig = JSON.stringify({
    width: config.width,
    height: config.height,
    coverType: config.coverType,
    flippingTime: config.flippingTime,
    bgColor: config.bgColor,
    bgImage: resolvedBgImage,
    bgOverlayOpacity: config.bgOverlayOpacity,
    dynamicShadows: config.dynamicShadows,
    shadowIntensity: config.shadowIntensity,
    soundEnabled: config.soundEnabled,
    autoplay: config.autoplay,
    autoplayIntervalMs: config.autoplayIntervalMs,
    zoomEnabled: config.zoomEnabled,
    zoomLevel: config.zoomLevel,
  }).replace(/</g, '\\u003c');

  const safeAudioUri = JSON.stringify(resolvedAudioUri);
  const pageFlipScriptTag = options.pageFlipPath
    ? `<script src="${escapeHtml(options.pageFlipPath)}"></script>`
    : `<script>${pageFlipSource.replace(/<\/script/gi, '<\\/script')}</script>`;

  return {
    config,
    seoTitle,
    seoDescription,
    seoKeywords,
    hasPassword,
    passwordSalt,
    passwordHash,
    brandUrl,
    brandLogoPosStyle,
    resolvedLogoSrc,
    resolvedAudioUri,
    resolvedBgImage,
    serializedPages,
    serializedHotspots,
    serializedConfig,
    safeAudioUri,
    pageFlipScriptTag,
  };
}
