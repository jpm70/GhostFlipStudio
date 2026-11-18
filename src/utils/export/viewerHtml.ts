import type { BookConfig, FlipbookPage, HotspotItem, UploadedDocument } from '../../types/flipbook';
import { buildIconCss } from '../icons';
import { buildViewerContext } from './context';
import type { GenerateHtmlOptions } from './context';
import { escapeHtml } from './escape';
import { buildPasswordGate } from './passwordGate';
import { buildViewerCss } from './viewerStyles';
import { buildViewerMarkup } from './viewerMarkup';
import { buildViewerScript } from './viewerScript';

export function generateStaticFlipbookHtml(
  config: BookConfig,
  pages: FlipbookPage[],
  doc: UploadedDocument | null,
  hotspots: HotspotItem[] = [],
  options: GenerateHtmlOptions = {},
): string {
  const ctx = buildViewerContext(config, pages, doc, hotspots, options);
  const { seoTitle, seoDescription, seoKeywords, pageFlipScriptTag } = ctx;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDescription)}" />
  <meta name="keywords" content="${escapeHtml(seoKeywords)}" />
  <meta property="og:title" content="${escapeHtml(seoTitle)}" />
  <meta property="og:description" content="${escapeHtml(seoDescription)}" />
  <meta property="og:type" content="website" />
  <style>${buildIconCss()}</style>
  ${pageFlipScriptTag}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Outfit:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
${buildViewerCss(ctx)}  </style>
</head>
<body>
${buildPasswordGate(ctx)}${buildViewerMarkup(ctx)}  <script>
${buildViewerScript(ctx)}  </script>
</body>
</html>`;
}
