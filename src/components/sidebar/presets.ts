export const BG_COLOR_PRESETS = [
  { label: 'Obsidiana', hex: '#020617' },
  { label: 'Pizarra', hex: '#0f172a' },
  { label: 'Terminal', hex: '#031510' },
  { label: 'Cobalto', hex: '#071426' },
  { label: 'Grafito', hex: '#18181b' },
];

export const DIMENSION_PRESETS = [
  { label: 'Revista 4:3', width: 840, height: 580 },
  { label: 'A4 Editorial', width: 760, height: 540 },
  { label: 'Cuadrado', width: 700, height: 680 },
];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
