function extensionFromMime(mime: string, fallback = 'jpg'): string {
  const clean = mime.toLowerCase().split(';')[0].trim();
  switch (clean) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'audio/mpeg':
      return 'mp3';
    default:
      return fallback;
  }
}

export function dataUrlToBlob(
  dataUrl: string,
  fallbackExt = 'jpg',
): { blob: Blob; ext: string } | null {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;

  const mime = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || '';

  let bytes: Uint8Array;
  if (isBase64) {
    const binaryStr = window.atob(payload);
    bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
  } else {
    const decoded = decodeURIComponent(payload);
    bytes = new TextEncoder().encode(decoded);
  }

  return {
    blob: new Blob([bytes.buffer as ArrayBuffer], { type: mime }),
    ext: extensionFromMime(mime, fallbackExt),
  };
}

export async function resolveSourceToBlob(
  src: string,
  fallbackExt = 'png',
): Promise<{ blob: Blob; ext: string } | null> {
  if (!src) return null;
  if (src.startsWith('data:')) {
    return dataUrlToBlob(src, fallbackExt);
  }
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const urlExt = src.split('?')[0].split('.').pop()?.toLowerCase();
    const ext = extensionFromMime(blob.type || '', urlExt || fallbackExt);
    return { blob, ext };
  } catch {
    return null;
  }
}

export function triggerDownloadBlob(blob: Blob, filename: string): void {
  if (typeof window.saveAs === 'function') {
    window.saveAs(blob, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
