import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const password = 'DdsDemo2026!';

async function openTrainingCard(page: Page, request: APIRequestContext) {
  const auth = await request.post('/api/v1/auth/login', {
    form: { username: 'administrator@dds.local', password },
  });
  expect(auth.ok()).toBeTruthy();
  const staff = { Authorization: 'Bearer ' + (await auth.json()).access_token };
  const email = 'gis-' + crypto.randomUUID() + '@dds.local';
  const user = await request.post('/api/v1/admin/users', {
    headers: staff,
    data: { email, name: 'Проверка карты', password, role: 'trainee' },
  });
  expect(user.status()).toBe(201);
  const login = await request.post('/api/v1/auth/login', { form: { username: email, password } });
  const token = (await login.json()).access_token;
  const started = await request.post('/api/v1/simulation/sessions', {
    headers: { Authorization: 'Bearer ' + token },
    data: { scenario_id: 'water' },
  });
  expect(started.status()).toBe(201);
  const card = await started.json();
  await page.goto('/');
  await page.evaluate((value) => sessionStorage.setItem('dds_token', value), token);
  await page.goto('/incidents/' + card.id);
}

test('offline GIS map loads local Moscow PMTiles pack with ODbL attribution', async ({
  page,
  request,
}) => {
  const externalRequests: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      !['127.0.0.1', 'localhost'].includes(url.hostname)
    ) {
      externalRequests.push(url.origin);
      return route.abort();
    }
    return route.continue();
  });
  await openTrainingCard(page, request);

  const bigTile = page.waitForResponse(
    (res) =>
      res.url().includes('maps/moscow.pmtiles') &&
      res.status() === 206 &&
      Number(res.headers()['content-length'] ?? 0) > 17000,
    { timeout: 20000 },
  );

  await page.getByRole('button', { name: 'Открыть карту', exact: true }).click();
  await expect(page.getByTestId('arm-map-panel')).toBeVisible();
  await expect(page.getByText('OSM · PMTiles', { exact: true })).toBeVisible();
  await expect(page.getByText(/Загружен локальный OSM-пакет Москвы \(PMTiles\)/)).toBeVisible();
  await bigTile;

  await expect(page.locator('.arm-map-local canvas')).toBeVisible();
  await expect(page.locator('.maplibregl-ctrl-zoom-in')).toBeVisible();
  await expect(page.getByText(/Участники OpenStreetMap \(ODbL\)/)).toBeVisible();
  expect(externalRequests).toEqual([]);
  const mapBox = await page.getByTestId('arm-offline-map').boundingBox();
  const captionBox = await page.locator('.arm-map-card').boundingBox();
  expect(captionBox!.y).toBeGreaterThanOrEqual(mapBox!.y + mapBox!.height);
  await page.mouse.move(0, 0);
  await expect(page.locator('.ant-tooltip:visible')).toHaveCount(0);

  // A tall drawer is clipped by its scroll container; capture the visible viewport.
  await page.screenshot({
    path: test.info().project.name === 'desktop'
      ? '../docs/images/map-gis-check.png'
      : '../docs/images/map-gis-mobile.png',
    animations: 'disabled',
  });
  await page.locator('.arm-map-card').scrollIntoViewIfNeeded();
  await expect(page.getByText('Условная учебная точка', { exact: true })).toBeInViewport();
  await page.screenshot({
    path: `../docs/images/map-gis-caption-${test.info().project.name}.png`,
    animations: 'disabled',
  });
});
