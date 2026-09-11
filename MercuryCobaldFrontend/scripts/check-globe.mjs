// Run against the Vite dev server: node scripts/check-globe.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  await page.addInitScript(() => {
    window.globeDrawCalls = 0;
    for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const original = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function (...args) {
        window.globeDrawCalls++;
        return original.apply(this, args);
      };
    }
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.GLOBE_TEST_URL ?? 'http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Карта (3D)', exact: true }).click();
  await page.getByText('Загрузите сценарий в панели слева, чтобы увидеть 3D-глобус.').waitFor();
  await page.getByRole('button', { name: '01. Полная группировка', exact: true }).click();
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('canvas').count(), 1);
  const idleDraws = await page.evaluate(() => window.globeDrawCalls);
  assert.ok(idleDraws > 0, 'Globe must issue WebGL drawing commands');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.globeDrawCalls), idleDraws, 'Idle globe must not keep drawing frames');
  const initial = await page.locator('canvas').screenshot();
  const rect = await page.locator('canvas').boundingBox();
  assert.ok(rect && rect.width > 100 && rect.height > 100);
  await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.8, rect.y + rect.height * 0.6, { steps: 25 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  assert.notDeepEqual(await page.locator('canvas').screenshot(), initial, 'Dragging must rotate the rendered globe');
  await page.getByRole('button', { name: 'Сбросить вид', exact: true }).click();
  await page.waitForTimeout(300);
  const stationPixel = await page.evaluate(async () => {
    const { PerspectiveCamera } = await import('/node_modules/three/build/three.module.js');
    const { sitePosition } = await import('/src/components/MapView/globeGeometry.ts');
    const { useScenarioStore } = await import('/src/store/useScenarioStore.ts');
    const bounds = document.querySelector('canvas').getBoundingClientRect();
    const camera = new PerspectiveCamera(42, bounds.width / bounds.height, 0.01, 30);
    const halfFov = Math.atan(Math.tan(21 * Math.PI / 180) * Math.min(1, bounds.width / bounds.height));
    camera.position.set(1.6, 2.3, -2.3).normalize().multiplyScalar(Math.max(3.7, 1.25 / Math.sin(halfFov)));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const positions = useScenarioStore.getState().effectiveScenario.ground_sites.map(site => sitePosition(site.lat_deg, site.lon_deg));
    positions.sort((a, b) => b.dot(camera.position) - a.dot(camera.position));
    const p = positions[0].project(camera);
    return { x: bounds.x + (p.x + 1) * bounds.width / 2, y: bounds.y + (1 - p.y) * bounds.height / 2 };
  });
  await page.mouse.click(stationPixel.x, stationPixel.y);
  await page.getByText('Роль', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.getByRole('button', { name: 'Следующий отсчёт', exact: true }).last().click();
  await page.waitForTimeout(300);
  assert.deepEqual(await page.getByRole('slider', { name: 'Момент расчёта', exact: true }).evaluateAll(sliders => sliders.map(s => s.value)), ['1', '1']);
  await page.getByRole('button', { name: 'Все ISL', exact: true }).click();
  await page.getByRole('button', { name: 'Покрытие спутников', exact: true }).click();
  await page.getByRole('button', { name: 'Зоны станций', exact: true }).click();
  const geometry = await page.evaluate(async () => {
    const { coverageAngle, coverageRing, sitePosition, globePosition } = await import('/src/components/MapView/globeGeometry.ts');
    const { elevationDeg } = await import('/src/utils/geometry.ts');
    const radius = 1 + 550 / 6371;
    const angle = coverageAngle(radius, 10);
    const satellite = { x: radius * 6371, y: 0, z: 0 };
    const ground = { x: 6371 * Math.cos(angle), y: 6371 * Math.sin(angle), z: 0 };
    const ring = coverageRing(sitePosition(0, 0), angle, 1);
    return { elevation: elevationDeg(satellite, ground), ringLength: ring.length, north: globePosition(0, 0, 6371).toArray(), equator: sitePosition(0, 90).toArray() };
  });
  assert.ok(Math.abs(geometry.elevation - 10) < 1e-8, 'Coverage boundary must match existing elevation calculation');
  assert.equal(geometry.ringLength, 64 * 6);
  assert.ok(geometry.north.every((v, i) => Math.abs(v - [0, 1, 0][i]) < 1e-8));
  assert.ok(Math.abs(geometry.equator[2] + 1) < 1e-8);
  await page.getByRole('button', { name: 'Покрытие спутников', exact: true }).click();
  await page.getByRole('button', { name: 'Зоны станций', exact: true }).click();
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/globe-desktop.png' });
  // Reopening exercises GPU resource cleanup and remounting in the existing grid.
  await page.getByRole('button', { name: 'Карта (3D)', exact: true }).click();
  assert.equal(await page.locator('canvas').count(), 0);
  await page.getByRole('button', { name: 'Карта (3D)', exact: true }).click();
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.screenshot({ path: 'artifacts/globe-small.png' });
  // All supplied fixtures, including the failure boundary, must render without errors.
  if (process.env.GLOBE_FIXTURES) {
    for (const file of ['01_full_constellation.json', '02_first_launch.json', '03_satellite_outages.json', '04_link_range.json']) {
      await page.reload();
      await page.locator('input[type="file"]').setInputFiles(`${process.env.GLOBE_FIXTURES}/${file}`);
      await page.waitForTimeout(700);
      await page.evaluate(async () => {
        const { useScenarioStore } = await import('/src/store/useScenarioStore.ts');
        useScenarioStore.getState().setTimeIndex(180);
      });
      await page.waitForTimeout(200);
      assert.equal(await page.locator('canvas').count(), 1);
    }
  }
  assert.deepEqual(errors, [], 'Browser must not report runtime or WebGL errors');
  console.log('Globe checks passed: load, rotation, picking, idle rendering, timeline sync, controls, coverage geometry, remount, resize; no browser errors.');
} finally {
  await browser.close();
}
