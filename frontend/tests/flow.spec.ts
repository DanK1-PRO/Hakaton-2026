import { test, expect } from '@playwright/test';

test('administrator creates user and instructor reviews a result', async ({
  page,
  request,
}, testInfo) => {
  const suffix = Date.now() + '-' + testInfo.project.name;
  const name = 'Проверка ролей ' + suffix;
  const email = 'roles-' + suffix + '@dds.local';
  await page.goto('/');
  await page.getByLabel('Электронная почта').fill('administrator@dds.local');
  await page.getByLabel('Пароль', { exact: true }).fill('DdsDemo2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Поиск происшествий' })).toBeVisible();
  await page.goto('/users');
  await page.getByRole('button', { name: /Добавить пользователя$/ }).click();
  await page.getByRole('button', { name: 'Сгенерировать пароль' }).click();
  await expect(page.getByText(/Пароль для передачи обучающемуся/)).toBeVisible();
  await page.getByLabel('Имя', { exact: true }).fill(name);
  await page.getByLabel('Почта', { exact: true }).fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill('DdsDemo2026!');
  await expect(page.getByText('Надёжный', { exact: true })).toBeVisible();
  await page.getByLabel('Повторите пароль', { exact: true }).fill('DdsDemo2026!');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const auth = await request.post('/api/v1/auth/login', {
    form: { username: email, password: 'DdsDemo2026!' },
  });
  expect(auth.ok()).toBeTruthy();
  const headers = { Authorization: 'Bearer ' + (await auth.json()).access_token };
  const started = await request.post('/api/v1/simulation/sessions', {
    headers,
    data: { scenario_id: 'wire' },
  });
  expect(started.status()).toBe(201);
  const card = await started.json();
  expect(
    (
      await request.post('/api/v1/simulation/sessions/' + card.session_id + '/finish', { headers })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await page.getByLabel('Электронная почта').fill('instructor@dds.local');
  await page.getByLabel('Пароль', { exact: true }).fill('DdsDemo2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Поиск происшествий' })).toBeVisible();
  await page.goto('/results');
  const row = page.getByRole('row').filter({ hasText: name });
  await row.getByRole('button', { name: 'Результат', exact: true }).click();
  await page
    .getByLabel('Комментарий и правильное действие')
    .fill('Нужно подтвердить получение и организовать реагирование.');
  await page.getByRole('button', { name: /Сохранить заключение$/ }).click();
  await expect(
    page.getByRole('dialog').getByText('Нужно подтвердить получение и организовать реагирование.'),
  ).toBeVisible();
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  if (testInfo.project.name === 'desktop')
    await page.screenshot({ path: '../docs/images/instructor.png', fullPage: true });
  const resultDialog = page.getByRole('dialog', { name: 'Результат занятия' });
  await resultDialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(resultDialog).toBeHidden({ timeout: 15000 });
  await expect(row.getByText('Подтверждено', { exact: true })).toBeVisible({ timeout: 15000 });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Отчёт CSV$/ }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('training-report.csv');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2),
  ).toBeFalsy();
});

test('training flow, phone, terminal lock and instructor feedback', async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const teacher = await request.post('/api/v1/auth/login', {
    form: { username: 'administrator@dds.local', password: 'DdsDemo2026!' },
  });
  expect(teacher.ok()).toBeTruthy();
  const token = (await teacher.json()).access_token;
  const email = 'e2e-' + Date.now() + '-' + testInfo.project.name + '@dds.local';
  const created = await request.post('/api/v1/admin/users', {
    headers: { Authorization: 'Bearer ' + token },
    data: { email, name: 'Проверка интерфейса', password: 'DdsDemo2026!', role: 'trainee' },
  });
  expect(created.status()).toBe(201);
  await page.goto('/');
  await page.getByLabel('Электронная почта').fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill('DdsDemo2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Поиск происшествий' })).toBeVisible();
  await page.getByRole('button', { name: /Начать занятие$/ }).click();
  await expect(page.getByRole('heading', { name: 'Учебные задания' })).toBeVisible();
  await expect(page.getByTestId('dds-profile-band')).toBeVisible();
  await expect(page.getByTestId('dds-profile-select')).toBeVisible();
  if (testInfo.project.name === 'desktop')
    await page.screenshot({ path: '../docs/images/training.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2),
  ).toBeFalsy();
  await page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Прорыв трубы в подъезде' }) })
    .getByRole('button', { name: 'Начать занятие' })
    .click();
  await expect(page.getByRole('button', { name: 'Изменить статус' })).toBeVisible();
  await expect(page.getByText('Получена службой', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Открытие', { exact: true })).toBeVisible();
  await expect(page.getByText(/норма 30 с/)).toBeVisible();
  await expect(page.getByText('Первая запись', { exact: true })).toBeVisible();
  await expect(page.getByText(/норма 3 мин/)).toBeVisible();
  const id = page.url().split('/').at(-1)!;
  const setStatus = async (label: string, comment: string) => {
    await page.getByRole('button', { name: 'Изменить статус' }).click();
    await page.getByLabel('Новый статус').click();
    await page
      .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
      .getByText(label, { exact: true })
      .click();
    await page.getByLabel('Комментарий', { exact: true }).fill(comment);
    await page.getByRole('button', { name: 'Сохранить статус' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('.ant-tooltip:not(.ant-tooltip-hidden)')).toHaveCount(0);
    await expect(page.getByText('Сохранить статус', { exact: true })).toBeHidden();
  };
  await setStatus('Принята', 'Информация принята, бригада направлена');
  await page.getByRole('button', { name: /Учебный вызов$/ }).click();
  await page.getByRole('button', { name: 'Принять вызов' }).click();
  await expect(page.getByText('Разговор', { exact: true })).toBeVisible();
  // A delayed refresh must not discard the newer card returned by a mutation.
  await page.route('**/api/v1/incidents/' + id, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Завершить вызов' }).click();
  await page.getByRole('button', { name: 'Редактировать карточку', exact: true }).click();
  await expect(page.getByText('Учебное дополнение ДДС', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Адрес происшествия', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Телефон заявителя', { exact: true })).toBeDisabled();
  await page
    .getByLabel('Описание происшествия', { exact: true })
    .fill('В подъезде прорвало трубу. Бригада уведомлена.');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await setStatus('Начало реагирования', 'Бригада выехала к месту происшествия');
  await page.unrouteAll({ behavior: 'wait' });
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await page.screenshot({
    path: '../docs/images/workspace-' + testInfo.project.name + '.png',
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  expect(overflow).toBeFalsy();
  await setStatus('Работы завершены', 'Вода перекрыта, течь устранена. Работы завершены.');
  await expect(page.getByText('Редактирование закрыто', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(
    page.getByRole('button', { name: 'Редактировать карточку', exact: true }),
  ).toBeHidden();
  await page.getByRole('button', { name: /Завершить занятие$/ }).click();
  await page.getByRole('button', { name: 'Завершить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Результат занятия' })).toBeVisible();
  await expect(page.getByText('По проверяемым критериям замечаний нет')).toBeVisible();
  await expect(page.getByLabel('Пояснение автоматической проверки')).toBeVisible();
  await expect(page.getByText('экспериментальный балл', { exact: true })).toBeVisible();
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await page.mouse.move(920, 520);
  await page.waitForTimeout(800);
  await page.locator('.ant-tooltip').evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  if (testInfo.project.name === 'desktop')
    await page.screenshot({ path: '../docs/images/result.png', fullPage: true });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Результат занятия' })).toBeVisible();
  const traineeAuth = await request.post('/api/v1/auth/login', {
    form: { username: email, password: 'DdsDemo2026!' },
  });
  const traineeToken = (await traineeAuth.json()).access_token;
  const card = await (
    await request.get('/api/v1/incidents/' + id, {
      headers: { Authorization: 'Bearer ' + traineeToken },
    })
  ).json();
  expect(card.events.some((e: { kind: string }) => e.kind === 'communication')).toBeTruthy();
  const feedback = await request.post(
    '/api/v1/instructor/sessions/' + card.session_id + '/feedback',
    {
      headers: { Authorization: 'Bearer ' + token },
      data: {
        verdict: 'corrected',
        comment: 'Проверено преподавателем. Уточнение результата работ сохранено.',
      },
    },
  );
  expect(feedback.status()).toBe(201);
  await page.reload();
  await expect(
    page.getByText('Проверено преподавателем. Уточнение результата работ сохранено.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'К списку', exact: true }).click();
  await page.getByRole('textbox', { name: 'Поиск происшествий', exact: true }).fill('В подъезде');
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await expect(page.getByRole('link', { name: card.number, exact: true })).toBeVisible();
  if (testInfo.project.name === 'desktop')
    await page.screenshot({ path: '../docs/images/incidents.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('login validation and invalid password', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Пароль', { exact: true }).fill('incorrect');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByText('Неверная почта или пароль')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2),
  ).toBeFalsy();
});

test('connection failure preserves unsaved form', async ({ page, request }) => {
  const auth = await request.post('/api/v1/auth/login', {
    form: { username: 'trainee@dds.local', password: 'DdsDemo2026!' },
  });
  const token = (await auth.json()).access_token;
  await page.goto('/');
  await page.evaluate((t) => sessionStorage.setItem('dds_token', t), token);
  await page.reload();
  await page.getByRole('button', { name: 'Создать карточку' }).click();
  await page.getByLabel('Адрес происшествия').fill('Учебный адрес');
  await page.getByLabel('Тип происшествия', { exact: true }).click();
  await page.getByLabel('Тип происшествия', { exact: true }).press('ArrowDown');
  await page.getByLabel('Тип происшествия', { exact: true }).press('Enter');
  await page.route('**/api/v1/incidents', (route) => route.abort());
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page.getByText(/Не удалось связаться с сервером/)).toBeVisible();
  await expect(page.getByLabel('Адрес происшествия')).toHaveValue('Учебный адрес');
});

test('incident filters show tags and reset clears them', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Электронная почта').fill('trainee@dds.local');
  await page.getByLabel('Пароль', { exact: true }).fill('DdsDemo2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Поиск происшествий' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Поиск происшествий', exact: true }).fill('Прорыв');
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await expect(page.getByText('Фильтры:', { exact: true })).toBeVisible();
  await expect(page.getByText('Поиск: Прорыв', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Сбросить/ }).click();
  await expect(page.getByText('Фильтры:', { exact: true })).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'Поиск происшествий', exact: true })).toHaveValue(
    '',
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2),
  ).toBeFalsy();
});

test('administrator filters users by role', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Электронная почта').fill('administrator@dds.local');
  await page.getByLabel('Пароль', { exact: true }).fill('DdsDemo2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Поиск происшествий' })).toBeVisible();
  await page.goto('/users');
  const table = page.getByRole('table');
  const roleFilter = page.getByLabel('Фильтр по роли').first();
  await roleFilter.click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
    .getByText('Преподаватель', { exact: true })
    .click();
  await expect(table.getByText('instructor@dds.local')).toBeVisible();
  await expect(table.getByText('trainee@dds.local')).toHaveCount(0);
  await expect(table.getByText('administrator@dds.local')).toHaveCount(0);
  await expect(table.getByText('Обучающийся', { exact: true })).toHaveCount(0);
  await roleFilter.click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
    .getByText('Администратор', { exact: true })
    .click();
  await expect(table.getByText('administrator@dds.local')).toBeVisible();
  await expect(table.getByText('instructor@dds.local')).toHaveCount(0);
  if (testInfo.project.name === 'desktop')
    await page.screenshot({ path: '../docs/images/users.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2),
  ).toBeFalsy();
});

test('readiness dashboard summarizes product contour for demonstration', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Электронная почта').fill('administrator@dds.local');
  await page.getByLabel('Пароль', { exact: true }).fill('DdsDemo2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Поиск происшествий' })).toBeVisible();
  await page.goto('/readiness');
  await expect(page.getByRole('heading', { name: 'Готовность контура' })).toBeVisible();
  await expect(page.getByText('Пилот готов к демонстрации в закрытом контуре')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ML-контур' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Комплект для проверки' })).toBeVisible();
  await expect(page.getByText('типов классификатора')).toBeVisible();
  if (testInfo.project.name === 'desktop')
    await page.screenshot({ path: '../docs/images/readiness.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2),
  ).toBeFalsy();
});

test('first record timer stops once the session is finished', async ({ page, request }) => {
  const teacher = await request.post('/api/v1/auth/login', {
    form: { username: 'administrator@dds.local', password: 'DdsDemo2026!' },
  });
  expect(teacher.ok()).toBeTruthy();
  const token = (await teacher.json()).access_token;
  const email = 'timer-' + Date.now() + '@dds.local';
  const created = await request.post('/api/v1/admin/users', {
    headers: { Authorization: 'Bearer ' + token },
    data: { email, name: 'Проверка таймера', password: 'DdsDemo2026!', role: 'trainee' },
  });
  expect(created.status()).toBe(201);
  const auth = await request.post('/api/v1/auth/login', {
    form: { username: email, password: 'DdsDemo2026!' },
  });
  expect(auth.ok()).toBeTruthy();
  const headers = { Authorization: 'Bearer ' + (await auth.json()).access_token };
  const started = await request.post('/api/v1/simulation/sessions', {
    headers,
    data: { scenario_id: 'wire' },
  });
  expect(started.status()).toBe(201);
  const card = await started.json();
  const finish = await request.post(
    '/api/v1/simulation/sessions/' + card.session_id + '/finish',
    { headers },
  );
  expect(finish.ok()).toBeTruthy();
  await page.goto('/');
  await page.getByLabel('Электронная почта').fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill('DdsDemo2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Поиск происшествий' })).toBeVisible();
  await page.goto('/incidents/' + card.id);
  await expect(page.getByRole('heading', { name: 'Результат занятия' })).toBeVisible();
  const chip = page.locator('.arm-sla').filter({ hasText: 'Первая запись' });
  await expect(chip).toContainText('не внесена');
  const frozen = await chip.innerText();
  await page.waitForTimeout(2000);
  expect(await chip.innerText()).toBe(frozen);
});
