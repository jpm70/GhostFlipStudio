// Librerías de terceros empaquetadas con Vite (sin CDN): el Studio funciona sin conexión.
// Se exponen en `window` porque el resto del código las consume como globales.
import '@fortawesome/fontawesome-free/css/all.min.css';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PageFlip } from 'page-flip';

(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
  pdfWorkerUrl;

const w = window as unknown as Record<string, unknown>;
w.pdfjsLib = pdfjsLib;
w.JSZip = JSZip;
w.saveAs = saveAs;
w.St = { PageFlip };
