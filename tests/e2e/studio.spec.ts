import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const here = path.dirname(fileURLToPath(import.meta.url));
const PDF = path.join(here, 'fixtures', 'prueba.pdf');
const CONFIG_KEY = 'ghostflip_studio_config_v1';

async function cargarPdf(page: Page) {
  await page.goto('/');
  await page.locator('input[type=file]').first().setInputFiles(PDF);
  // El PDF de prueba tiene 4 páginas: el libro se reconstruye con 4 elementos.
  await expect(page.locator('.stf__item')).toHaveCount(4);
}

async function exportar(page: Page, boton: 'HTML Único' | 'Descargar ZIP') {
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: boton }).click();
  const file = await download;
  const dest = path.join(test.info().outputDir, file.suggestedFilename());
  await file.saveAs(dest);
  return dest;
}

test('carga un PDF y muestra sus páginas (la imagen no se pierde)', async ({ page }) => {
  await cargarPdf(page);
  await expect(page.getByText('prueba.pdf').first()).toBeVisible();
  // Regresión: StPageFlip reescribía el style de la página y borraba la imagen.
  const capa = page.locator('.stf__item .page-content').first();
  await expect(capa).toHaveCSS('background-image', /^url\("data:image\/jpeg/);
});

test('el tema claro/oscuro cambia, se recuerda y el escenario sigue oscuro', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('ghostflip_theme')) localStorage.setItem('ghostflip_theme', 'dark'); });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Cambiar a modo claro' }).click();
  await expect(html).toHaveClass(/light/);
  expect(await page.evaluate(() => localStorage.getItem('ghostflip_theme'))).toBe('light');
  await page.reload();
  await expect(html).toHaveClass(/light/);
  const [fondoPanel, fondoEscenario] = await page.evaluate(() => [
    getComputedStyle(document.querySelector('aside')!).backgroundColor,
    getComputedStyle(document.querySelector('.keep-dark')!).backgroundColor,
  ]);
  expect(fondoPanel).not.toBe(fondoEscenario);
});

test('HTML único con contraseña: sin CDN, desbloquea con la clave correcta y no con otra', async ({ page, browser }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ passwordProtected: true, passwordValue: 'secreto' }));
  }, CONFIG_KEY);
  await page.goto('/');
  const ruta = await exportar(page, 'HTML Único');
  const html = fs.readFileSync(ruta, 'utf8');

  // Autocontenido: solo quedan las tipografías de Google Fonts y el enlace de marca.
  const externos = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]);
  expect(externos.filter((u) => !/fonts\.g|unfantasmaenelsistema\.com/.test(u))).toEqual([]);
  expect(html).toContain('ghostflipHash');
  expect(html).not.toContain('secreto');

  for (const [clave, desbloquea] of [['secreto', true], ['otra', false]] as const) {
    const ctx = await browser.newContext();
    const visor = await ctx.newPage();
    visor.on('dialog', (d) => d.accept(clave));
    await visor.goto(pathToFileURL(ruta).href);
    await expect.poll(() => visor.evaluate(() => (window as any).__ghostflipUnlocked)).toBe(desbloquea);
    if (desbloquea) await expect(visor.locator('#viewer-root')).toBeVisible();
    else await expect(visor.locator('#viewer-root')).toBeHidden();
    await ctx.close();
  }
});

test('el ZIP incluye el motor page-flip y el index lo referencia', async ({ page }) => {
  await page.goto('/');
  const ruta = await exportar(page, 'Descargar ZIP');
  const zip = await JSZip.loadAsync(fs.readFileSync(ruta));
  expect(Object.keys(zip.files)).toEqual(
    expect.arrayContaining(['index.html', 'assets/page-flip.min.js', 'assets/page-flip.wav']),
  );
  const index = await zip.file('index.html')!.async('string');
  expect(index).toContain('src="assets/page-flip.min.js"');
});

test('el proxy de PDFs rechaza destinos internos', async ({ request }) => {
  for (const url of ['http://127.0.0.1/', 'http://localhost/', 'http://[::ffff:7f00:1]/', 'http://169.254.169.254/']) {
    const res = await request.get('/api/remote-pdf', { params: { url } });
    expect(res.status(), url).toBe(400);
  }
  const sinUrl = await request.get('/api/remote-pdf');
  expect(sinUrl.status()).toBe(400);
});
