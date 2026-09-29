import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'http://127.0.0.1:5173';
const API = 'http://127.0.0.1:8000';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(root, '.runtime', 'demo-video');
const target = path.join(root, 'docs', 'delivery', 'dds-demo.webm');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'ru-RU',
  deviceScaleFactor: 1,
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
page.setDefaultTimeout(20000);

const account = {
  name: 'Демонстрация ДДС ' + String(Date.now()).slice(-4),
  email: 'demo-' + Date.now() + '@dds.local',
  password: 'DdsDemo2026!',
};

async function login(email) {
  await page.goto(BASE + '/');
  await page.getByLabel('Электронная почта').fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.getByRole('heading', { name: 'Поиск происшествий' }).waitFor();
  await pause(1400);
}

async function logout() {
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await pause(1200);
}

async function setStatus(label, comment) {
  await page.getByRole('button', { name: 'Изменить статус' }).click();
  await page.getByLabel('Новый статус').click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
    .getByText(label, { exact: true })
    .click();
  await page.getByLabel('Комментарий', { exact: true }).fill(comment);
  await page.getByRole('button', { name: 'Сохранить статус' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await pause(1400);
}

try {
  const auth = await context.request.post(API + '/api/v1/auth/login', {
    form: { username: 'administrator@dds.local', password: account.password },
  });
  const token = (await auth.json()).access_token;
  await context.request.post(API + '/api/v1/admin/users', {
    headers: { Authorization: 'Bearer ' + token },
    data: { email: account.email, name: account.name, password: account.password, role: 'trainee' },
  });

  await login(account.email);

  await page.getByRole('button', { name: /Начать занятие$/ }).click();
  await page.getByRole('heading', { name: 'Учебные задания' }).waitFor();
  await pause(1600);

  await page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Прорыв трубы в подъезде' }) })
    .getByRole('button', { name: 'Начать занятие' })
    .click();
  await page.getByRole('button', { name: 'Изменить статус' }).waitFor();
  await pause(2200);

  await setStatus('Принята', 'Информация принята, бригада направлена к месту происшествия');

  await page.getByRole('button', { name: /Учебный вызов$/ }).click();
  await page.getByRole('button', { name: 'Принять вызов' }).click();
  await page.getByText('Разговор', { exact: true }).waitFor();
  await pause(3500);
  await page.getByRole('button', { name: 'Завершить вызов' }).click();
  await pause(1400);

  await setStatus('Начало реагирования', 'Бригада выехала к месту происшествия');
  await setStatus('Работы завершены', 'Вода перекрыта, течь устранена. Работы завершены.');

  await page.getByRole('button', { name: /Завершить занятие$/ }).click();
  await page.getByRole('button', { name: 'Завершить', exact: true }).click();
  await page.getByRole('heading', { name: 'Результат занятия' }).waitFor();
  await pause(3000);
  await page.mouse.wheel(0, 500);
  await pause(2500);
  await page.mouse.wheel(0, -500);
  await pause(1200);

  await page.goto(BASE + '/results');
  await pause(3500);

  await logout();

  await login('instructor@dds.local');
  await page.goto(BASE + '/results');
  await page.getByRole('heading', { name: 'Контроль занятий' }).waitFor();
  await pause(1600);
  const row = page.getByRole('row').filter({ hasText: account.name });
  await row.getByRole('button', { name: 'Результат', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await pause(2500);
  await page
    .getByLabel('Комментарий и правильное действие')
    .fill('Нужно подтвердить получение и организовать реагирование. Оценка верна.');
  await page.getByRole('button', { name: /Сохранить заключение$/ }).click();
  await pause(2500);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await pause(1500);

  await logout();

  await login('administrator@dds.local');
  await page.goto(BASE + '/readiness');
  await page.waitForURL('**/readiness');
  await pause(3000);
  for (let step = 0; step < 6; step += 1) {
    await page.mouse.wheel(0, 420);
    await pause(900);
  }
  await pause(1500);
} finally {
  await context.close();
  await browser.close();
}

const video = fs
  .readdirSync(outDir)
  .filter((file) => file.endsWith('.webm'))
  .map((file) => path.join(outDir, file))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
if (!video) throw new Error('Video file was not produced');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(video, target);
const size = fs.statSync(target).size;
console.log('recorded: ' + target + ' (' + Math.round(size / 1024) + ' KB)');
