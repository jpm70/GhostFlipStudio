import {
  faBackwardStep, faChevronLeft, faChevronRight, faCompress, faExpand, faForwardStep, faLock,
  faMinus, faPause, faPlay, faPlus, faTableCells, faVolumeHigh, faVolumeXmark,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

const ICONS: Record<string, IconDefinition> = {
  'backward-step': faBackwardStep, 'chevron-left': faChevronLeft, 'chevron-right': faChevronRight,
  compress: faCompress, expand: faExpand, 'forward-step': faForwardStep, lock: faLock,
  minus: faMinus, pause: faPause, play: faPlay, plus: faPlus, 'table-cells': faTableCells,
  'volume-high': faVolumeHigh, 'volume-xmark': faVolumeXmark,
};

/**
 * CSS mínimo con los iconos del visor exportado como máscaras SVG en data-URI, para no depender
 * de Font Awesome por CDN. Mantiene el marcado `<i class="fa-solid fa-xxx">` y los cambios de
 * clase en tiempo de ejecución.
 */
export function buildIconCss(): string {
  const rules = Object.entries(ICONS).map(([name, def]) => {
    const [w, h, , , path] = def.icon;
    const d = Array.isArray(path) ? path.join('') : path;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'><path d='${d}'/></svg>`;
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    return `.fa-solid.fa-${name}{-webkit-mask-image:${url};mask-image:${url}}`;
  });
  return `.fa-solid{display:inline-block;width:1em;height:1em;vertical-align:-0.125em;background-color:currentColor;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain}${rules.join('')}`;
}
