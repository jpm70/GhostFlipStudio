/**
 * Generates a compact, valid Base64-encoded RIFF/WAVE paper-flip sound
 * and plays it via the standard HTML5 Audio API (`new Audio(dataUri)`).
 */
function buildPaperFlipWavBase64(): string {
  const sampleRate = 16000;
  const durationSec = 0.14;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2; // 16-bit mono PCM
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  // fmt chunk
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  // data chunk
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  // Deterministic pseudo-random soft paper brush + low-pass smoothing
  let seed = 1337;
  let prev = 0;
  for (let i = 0; i < numSamples; i++) {
    seed = (seed * 16807) % 2147483647;
    const white = (seed / 2147483647) * 2 - 1;
    // Soften harsh high frequencies to resemble crisp paper sliding
    const smoothed = prev * 0.58 + white * 0.42;
    prev = smoothed;

    const t = i / numSamples;
    const envelope = Math.sin(t * Math.PI) * Math.pow(1 - t, 1.35);
    const sample = Math.max(-1, Math.min(1, smoothed * envelope * 0.65));
    view.setInt16(44 + i * 2, Math.floor(sample * 32767), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export const PAGE_FLIP_AUDIO_BASE64: string =
  typeof window !== 'undefined' ? buildPaperFlipWavBase64() : '';

let pageFlipAudio: HTMLAudioElement | null = null;

export function playPageFlipSound(): void {
  if (typeof window === 'undefined' || !PAGE_FLIP_AUDIO_BASE64) return;

  try {
    if (!pageFlipAudio) {
      pageFlipAudio = new Audio(PAGE_FLIP_AUDIO_BASE64);
      pageFlipAudio.volume = 0.45;
    }
    pageFlipAudio.currentTime = 0;
    const playPromise = pageFlipAudio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore browser autoplay block prior to user interaction
      });
    }
  } catch {
    // Ignore unsupported audio contexts
  }
}
