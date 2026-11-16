export type CoverType = 'hard' | 'soft';

export type DocumentFormat = 'PDF' | 'HTML' | 'PPTX' | 'DEMO';

export type AccordionSectionId = 'upload' | 'book' | 'appearance' | 'controls' | 'branding';

export interface UploadedDocument {
  name: string;
  sizeBytes: number;
  format: DocumentFormat;
  lastModified: number;
  pageCount: number;
  extractedSections?: string[];
  notice?: string;
  sourceUrl?: string;
}

export interface FlipbookPage {
  id: number;
  label: string;
  title: string;
  subtitle?: string;
  body: string;
  codeSnippet?: string;
  imageDataUrl?: string;
  isCover?: boolean;
  isBackCover?: boolean;
}

export interface ParseProgress {
  active: boolean;
  fileName: string;
  format: DocumentFormat;
  current: number;
  total: number;
  percent: number;
  statusText: string;
}

export interface DocumentReadyEventDetail {
  fileName: string;
  format: DocumentFormat;
  pages: string[];
  structuredPages: FlipbookPage[];
  notice?: string;
  sizeBytes?: number;
  sourceUrl?: string;
}

export interface BookConfig {
  width: number;
  height: number;
  coverType: CoverType;
  flippingTime: number;
  bgColor: string;
  bgImage: string | null;
  bgOverlayOpacity: number;
  dynamicShadows: boolean;
  shadowIntensity: number;
  soundEnabled: boolean;
  autoplay: boolean;
  autoplayIntervalMs: number;
  zoomEnabled: boolean;
  zoomLevel: number;
  brandLogo: string;
  brandLogoPosition: 'top-left' | 'top-right';
  brandUrl: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  passwordProtected: boolean;
  passwordValue: string;
}

export interface HotspotItem {
  id: string;
  page: number;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
}

declare global {
  interface Window {
    hotspotsData?: HotspotItem[];
  }
}

