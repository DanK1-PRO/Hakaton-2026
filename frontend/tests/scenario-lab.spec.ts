import { test, expect } from '@playwright/test';

const generated = (id: string) => ({
  schema_version: '1.0',
  id,
  title: 'Утечка газа в подъезде',
  difficulty: 'medium',
  difficulty_score: 4.5,
  difficulty_factors: ['тип: утечка газа (+2.5)'],
  service: 'МОСГАЗ',
  prompt: 'Сообщение о запахе газа в подъезде жилого дома.',
  briefing: ['Бригада газовой службы направлена'],
  card: {
    caller_number: '+70000000000',
    name: 'Заявитель ' + id,
    address: 'Россия, Москва, Тестовый проезд, 5',
    incident_type_id: 681,
    comments: 'Запах газа в подъезде',
  },
  reference: {
    version: '1.0-generated',
    address: 'Россия, Москва, Тестовый проезд, 5',
    incident_type_id: 681,
    expected_actions: ['accepted', 'responding', 'completed'],
  },
  source: {
    type: 'llm_generated',
    model: 'local-model',
    status: 'GENERATED',
    note: 'Требует проверки преподавателем.',
  },
  ml_metadata: { category: 'Утечка газа', features: [], difficulty_score: 4.5 },
});

async function signIn(page, email: string) {
  await page.goto('/');
  await page.getByLabel('Электронная почта').fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill('DdsDemo2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Поиск происшествий' })).toBeVisible();
  await page.goto('/results');
}

test('instructor generates variants and imports only the reviewed one', async ({ page }) => {
  const suffix = Date.now();
  const items = [generated('generated_e2e_' + suffix + '_a'), generated('generated_e2e_' + suffix + '_b')];
  const generateRequests: Record<string, unknown>[] = [];
  const importRequests: { items: unknown[] }[] = [];
  await page.route('**/api/v1/ml/status', (route) =>
    route.fulfill({
      json: {
        mode: 'local',
        available: true,
        asr: false,
        capabilities: ['evaluator', 'scenario_generator'],
        generator: true,
      },
    }),
  );
  await page.route('**/api/v1/instructor/scenarios/generate', async (route) => {
    generateRequests.push(route.request().postDataJSON());
    await route.fulfill({
      json: { schema_version: '1.0', mode: 'local', model: 'local-model', items },
    });
  });
  await page.route('**/api/v1/instructor/scenarios/import', async (route) => {
    importRequests.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { imported: 1, ids: [items[1].id] } });
  });

  await signIn(page, 'instructor@dds.local');
  await page.getByTestId('scenario-lab-open').click();
  const dialog = page.getByRole('dialog', { name: 'Генерация учебных сценариев' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Генерация сейчас недоступна')).toHaveCount(0);

  await page.getByTestId('scenario-lab-type').click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
    .first()
    .click();
  await page.getByTestId('scenario-lab-difficulty').click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
    .filter({ hasText: 'Базовый' })
    .first()
    .click();
  await page.getByTestId('scenario-lab-generate').click();

  const preview = page.getByTestId('scenario-lab-preview');
  await expect(preview).toBeVisible();
  await expect(page.getByTestId('scenario-preview-item')).toHaveCount(2);
  await expect(preview.getByText('Утечка газа в подъезде').first()).toBeVisible();
  expect(generateRequests).toHaveLength(1);
  expect(generateRequests[0].difficulty).toBe('easy');
  expect(generateRequests[0].count).toBe(1);
  expect(typeof generateRequests[0].incident_type_id).toBe('number');

  const boxes = dialog.getByRole('checkbox', { name: 'Импортировать' });
  await boxes.first().uncheck();
  await expect(page.getByTestId('scenario-lab-import')).toHaveText(/Импортировать выбранные \(1\)/);
  await page.getByTestId('scenario-lab-import').click();
  await expect(page.getByText('Импортировано сценариев: 1')).toBeVisible();
  await expect(dialog).toBeHidden();
  expect(importRequests).toHaveLength(1);
  expect(importRequests[0].items).toHaveLength(1);
  expect((importRequests[0].items[0] as { id: string }).id).toBe(items[1].id);
});

test('generation stays disabled while the ML generator is unavailable', async ({ page }) => {
  await page.route('**/api/v1/ml/status', (route) =>
    route.fulfill({
      json: {
        mode: 'mock',
        available: true,
        asr: false,
        capabilities: ['evaluator', 'scenario_catalog'],
        generator: false,
      },
    }),
  );
  await signIn(page, 'instructor@dds.local');
  await page.getByTestId('scenario-lab-open').click();
  const dialog = page.getByRole('dialog', { name: 'Генерация учебных сценариев' });
  await expect(dialog.getByText('Генерация сейчас недоступна')).toBeVisible();
  await expect(page.getByTestId('scenario-lab-generate')).toBeDisabled();
});
