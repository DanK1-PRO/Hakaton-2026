import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const password = 'DdsDemo2026!';
async function caseFor(page: Page, request: APIRequestContext) {
  const auth = await request.post('/api/v1/auth/login', {
    form: { username: 'administrator@dds.local', password },
  });
  expect(auth.ok()).toBeTruthy();
  const staff = { Authorization: 'Bearer ' + (await auth.json()).access_token };
  const email = 'arm-' + crypto.randomUUID() + '@dds.local';
  const user = await request.post('/api/v1/admin/users', {
    headers: staff,
    data: { email, name: 'Проверка АРМ', password, role: 'trainee' },
  });
  expect(user.status()).toBe(201);
  const login = await request.post('/api/v1/auth/login', { form: { username: email, password } });
  const token = (await login.json()).access_token;
  const headers = { Authorization: 'Bearer ' + token };
  const started = await request.post('/api/v1/simulation/sessions', {
    headers,
    data: { scenario_id: 'water' },
  });
  expect(started.status()).toBe(201);
  const card = await started.json();
  await page.goto('/');
  await page.evaluate((value) => sessionStorage.setItem('dds_token', value), token);
  await page.goto('/incidents/' + card.id);
  await expect(page.getByRole('button', { name: 'Изменить статус', exact: true })).toBeVisible();
  await expect(
    page.getByTestId('arm-service-history').getByText('Получена службой', { exact: true }),
  ).toBeVisible();
  return { card, headers, staff };
}

async function selectStatus(page: Page, label: string) {
  await page.getByRole('button', { name: 'Изменить статус', exact: true }).click();
  await page.getByLabel('Новый статус').click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
    .getByText(label, { exact: true })
    .click();
}

test('ARM source layout, service history and training context remain accessible', async ({
  page,
  request,
}, info) => {
  await caseFor(page, request);
  const sizes = info.project.name === 'desktop' ? [1440, 1920, 1024] : [390];
  for (const width of sizes) {
    await page.setViewportSize({ width, height: 1000 });
    const geometry = await page.evaluate(() => {
      const box = (selector: string) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
      };
      return {
        phone: box('.arm-phone'),
        left: box('.arm-left'),
        right: box('.arm-right'),
        dock: box('.arm-service-dock'),
        history: box('.arm-service-history'),
        bar: box('.arm-service-bar'),
        bg: getComputedStyle(document.querySelector('.arm-scene')!).backgroundColor,
        serviceBg: getComputedStyle(document.querySelector('.arm-service-bar')!).backgroundColor,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      };
    });
    expect(geometry.bg).toBe('rgb(201, 206, 209)');
    expect(geometry.serviceBg).toBe('rgb(236, 101, 59)');
    expect(geometry.overflow).toBeFalsy();
    expect(geometry.phone.bottom).toBeLessThanOrEqual(geometry.left.y);
    expect(geometry.history.bottom).toBeLessThanOrEqual(geometry.bar.y + 1);
    expect(geometry.dock.y).toBeGreaterThanOrEqual(geometry.left.bottom);
    if (width > 700) {
      expect(geometry.left.right).toBeLessThan(geometry.right.x);
      expect(Math.abs(geometry.left.y - geometry.right.y)).toBeLessThan(2);
    } else expect(geometry.right.y).toBeGreaterThanOrEqual(geometry.left.bottom);
  }
  await page.getByRole('button', { name: 'Свернуть историю службы', exact: true }).click();
  await expect(page.getByTestId('arm-service-history')).toBeHidden();
  await page.getByRole('button', { name: 'История реагирования службы', exact: true }).click();
  await expect(page.getByTestId('arm-service-history')).toBeVisible();
  await page.getByRole('button', { name: 'Сведения о занятии', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Подтверждение получения', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Учебный материал', exact: true }).click();
  await expect(page.getByText('Информация от реагирующей службы', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.getByRole('button', { name: 'Открыть карту', exact: true }).click();
  await expect(page.getByTestId('arm-map-panel')).toBeVisible();
  await expect(page.getByText('Локальная карта Москвы', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/точное определение координат по адресу не подключено/),
  ).toBeVisible();
  await expect(page.getByTestId('arm-offline-map')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'локальный OSM-слой', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.getByRole('button', { name: 'Справочник маршрутов', exact: true }).click();
  await expect(
    page.locator('.ant-drawer').getByText(/Для ДДС бригады выбираются вручную/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect(page.locator('.ant-drawer-content:visible')).toHaveCount(0);
  if (info.project.name === 'desktop') await page.setViewportSize({ width: 1440, height: 1000 });
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: '../docs/images/arm-reference-' + info.project.name + '.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('concurrent update preserves draft and requires explicit reload before save', async ({
  page,
  request,
}) => {
  const { card, headers } = await caseFor(page, request);
  await page.getByRole('button', { name: 'Редактировать карточку', exact: true }).click();
  await page
    .getByLabel('Описание происшествия', { exact: true })
    .fill('Мой несохранённый черновик');
  const latest = await (await request.get('/api/v1/incidents/' + card.id, { headers })).json();
  const changed = await request.patch('/api/v1/incidents/' + card.id, {
    headers,
    data: {
      caller_number: latest.caller_number,
      name: latest.name,
      address: latest.address,
      incident_type_id: latest.incident_type_id,
      comments: 'Изменения во второй вкладке',
      version: latest.version,
    },
  });
  expect(changed.ok()).toBeTruthy();
  await expect(page.getByText('Карточка обновилась. Черновик сохранён.')).toBeVisible({
    timeout: 12000,
  });
  await expect(page.getByLabel('Описание происшествия', { exact: true })).toHaveValue(
    'Мой несохранённый черновик',
  );
  await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Загрузить актуальные данные', exact: true }).click();
  await page.getByRole('button', { name: 'Оставить черновик', exact: true }).click();
  await expect(page.getByLabel('Описание происшествия', { exact: true })).toHaveValue(
    'Мой несохранённый черновик',
  );
  await page.getByRole('button', { name: 'Загрузить актуальные данные', exact: true }).click();
  await page.getByRole('button', { name: 'Загрузить', exact: true }).click();
  await expect(page.getByLabel('Описание происшествия', { exact: true })).toHaveValue(
    'Изменения во второй вкладке',
  );
  await page
    .getByLabel('Описание происшествия', { exact: true })
    .fill('Проверенные объединённые сведения');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.arm-description')).toContainText('Проверенные объединённые сведения');
});

test('refusal requires a reason, cancel retains draft and terminal state locks all writes', async ({
  page,
  request,
}, info) => {
  await caseFor(page, request);
  await selectStatus(page, 'Не принята');
  await page.getByRole('button', { name: 'Сохранить статус', exact: true }).click();
  await expect(
    page.getByText('Укажите причину отказа; передачу информации укажите при наличии', {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel('Комментарий', { exact: true })
    .fill('Чужая зона ответственности. Передано по принадлежности.');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить редактирование', exact: true }).click();
  await expect(page.getByLabel('Комментарий', { exact: true })).toHaveValue(
    'Чужая зона ответственности. Передано по принадлежности.',
  );
  await page.screenshot({
    path: '../docs/images/arm-reaction-' + info.project.name + '.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Сохранить статус', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await selectStatus(page, 'Принята');
  await page.getByRole('button', { name: 'Сохранить статус', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await selectStatus(page, 'Отказ от выполнения работ');
  await page
    .getByLabel('Комментарий', { exact: true })
    .fill('Обслуживает другая организация. Информация передана.');
  await page.getByRole('button', { name: 'Сохранить статус', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Изменить статус', exact: true })).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Редактировать карточку', exact: true }),
  ).toBeHidden();
  await expect(page.getByRole('button', { name: 'Учебный вызов', exact: true })).toBeHidden();
  await page.reload();
  await expect(page.getByText('Редактирование закрыто', { exact: true })).toBeVisible();
});

test('staff inspection does not offer trainee mutation actions', async ({ page, request }) => {
  const { card } = await caseFor(page, request);
  const response = await request.post('/api/v1/auth/login', {
    form: { username: 'instructor@dds.local', password },
  });
  const token = (await response.json()).access_token;
  await page.evaluate((value) => sessionStorage.setItem('dds_token', value), token);
  await page.reload();
  await expect(page.getByText('Просмотр преподавателя', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Редактировать карточку', exact: true }),
  ).toBeHidden();
  await expect(page.getByRole('button', { name: 'Изменить статус', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Учебный вызов', exact: true })).toBeHidden();
  expect(page.url()).toContain(card.id);
});
