import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MAX_REMOTE_PDF_BYTES = 50 * 1024 * 1024; // 50 MB
const REMOTE_TIMEOUT_MS = 25000;

function isPrivateOrLoopbackIp(ip: string): boolean {
  const clean = ip.replace(/^::ffff:/i, '');
  if (net.isIPv4(clean)) {
    const parts = clean.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (net.isIPv6(clean)) {
    const lower = clean.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
      return true;
    }
    return false;
  }

  return true;
}

async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('La URL introducida no es válida.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Solo se admiten URLs con protocolo http:// o https://.');
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('No se permiten direcciones locales o privadas.');
  }

  if (net.isIP(host)) {
    if (isPrivateOrLoopbackIp(host)) {
      throw new Error('No se permiten direcciones IP privadas o de loopback.');
    }
    return parsed;
  }

  try {
    const resolved = await dns.lookup(host, { all: true });
    if (!resolved.length || resolved.some((entry) => isPrivateOrLoopbackIp(entry.address))) {
      throw new Error('El host remoto resuelve a una dirección privada no permitida.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('no permitida')) {
      throw err;
    }
    throw new Error('No se pudo resolver el dominio de la URL proporcionada.');
  }

  return parsed;
}

function extractFilename(parsedUrl: URL, contentDisposition: string | null): string {
  if (contentDisposition) {
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/i);
    if (utf8Match?.[1]) {
      try {
        const decoded = decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ''));
        if (decoded) return decoded;
      } catch {
        // Ignore malformed filename*
      }
    }
    const plainMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
    if (plainMatch?.[1]) {
      const cleaned = plainMatch[1].trim();
      if (cleaned) return cleaned;
    }
  }

  const segment = parsedUrl.pathname.split('/').filter(Boolean).pop();
  if (segment) {
    try {
      const decoded = decodeURIComponent(segment);
      return decoded.toLowerCase().endsWith('.pdf') ? decoded : `${decoded}.pdf`;
    } catch {
      return segment.toLowerCase().endsWith('.pdf') ? segment : `${segment}.pdf`;
    }
  }
  return 'documento_remoto.pdf';
}

async function startServer() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/remote-pdf', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl) {
      res.status(400).json({ error: 'Debes indicar el parámetro url.' });
      return;
    }

    let safeUrl: URL;
    try {
      safeUrl = await assertSafePublicUrl(rawUrl);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'URL remota no válida.',
      });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);

    try {
      const upstream = await fetch(safeUrl.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          Accept: 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.5',
          'User-Agent': 'GhostFlip-Studio/1.0 (+https://www.unfantasmaenelsistema.com/)',
        },
      });

      if (!upstream.ok) {
        res.status(502).json({
          error: `El servidor remoto devolvió HTTP ${upstream.status}. Verifica que el PDF sea público.`,
        });
        return;
      }

      if (upstream.url) {
        try {
          await assertSafePublicUrl(upstream.url);
        } catch {
          res.status(400).json({ error: 'Redirección hacia una dirección no permitida.' });
          return;
        }
      }

      const contentLengthHeader = upstream.headers.get('content-length');
      if (contentLengthHeader) {
        const declaredSize = Number(contentLengthHeader);
        if (!Number.isNaN(declaredSize) && declaredSize > MAX_REMOTE_PDF_BYTES) {
          res.status(413).json({ error: 'El PDF remoto supera el límite máximo de 50 MB.' });
          return;
        }
      }

      const reader = upstream.body?.getReader();
      if (!reader) {
        res.status(502).json({ error: 'El servidor remoto no devolvió contenido legible.' });
        return;
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_REMOTE_PDF_BYTES) {
          await reader.cancel();
          res.status(413).json({ error: 'El PDF remoto supera el límite máximo de 50 MB.' });
          return;
        }
        chunks.push(value);
      }

      const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      const headerProbe = buffer.subarray(0, 1024).toString('latin1');
      if (!headerProbe.includes('%PDF-')) {
        res.status(415).json({
          error: 'La URL no devolvió un archivo PDF válido (puede requerir autenticación o ser una página HTML).',
        });
        return;
      }

      const resolvedUrl = upstream.url ? new URL(upstream.url) : safeUrl;
      const fileName = extractFilename(
        resolvedUrl,
        upstream.headers.get('content-disposition'),
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('X-Resolved-Filename', encodeURIComponent(fileName));
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(buffer);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        res.status(504).json({
          error: 'Tiempo de espera agotado al descargar el PDF remoto.',
        });
        return;
      }
      res.status(502).json({
        error: 'No se pudo conectar con la URL remota para descargar el PDF.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GhostFlip Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
