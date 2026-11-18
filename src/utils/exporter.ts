// Fachada: el exportador está dividido en src/utils/export/*.
export { dataUrlToBlob } from './export/blobs';
export type { GenerateHtmlOptions } from './export/context';
export { generateStaticFlipbookHtml } from './export/viewerHtml';
export { exportFlipbookZip, exportStandaloneFlipbook } from './export/zipExport';
export type { ZipExportResult } from './export/zipExport';
