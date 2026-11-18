export interface StPageFlipInstance {
  loadFromHTML: (items: HTMLElement[] | NodeListOf<HTMLElement>) => void;
  updateFromHtml?: (items: HTMLElement[] | NodeListOf<HTMLElement>) => void;
  flipNext: (corner?: 'top' | 'bottom') => void;
  flipPrev: (corner?: 'top' | 'bottom') => void;
  flip: (pageNum: number, corner?: 'top' | 'bottom') => void;
  turnToPage: (pageNum: number) => void;
  getCurrentPageIndex: () => number;
  getPageCount: () => number;
  on: (eventName: string, callback: (e: { data: number }) => void) => void;
  destroy: () => void;
}

export interface StNamespace {
  PageFlip: new (
    htmlElement: HTMLElement,
    settings: {
      width: number;
      height: number;
      size?: 'fixed' | 'stretch';
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
      drawShadow?: boolean;
      flippingTime?: number;
      usePortrait?: boolean;
      startZIndex?: number;
      autoSize?: boolean;
      maxShadowOpacity?: number;
      showCover?: boolean;
      mobileScrollSupport?: boolean;
      swipeDistance?: number;
      clickEventForward?: boolean;
      useMouseEvents?: boolean;
      disableFlipByClick?: boolean;
    },
  ) => StPageFlipInstance;
}

declare global {
  interface Window {
    St?: StNamespace;
  }
}
