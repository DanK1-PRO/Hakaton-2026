import { Alert, Button, Form, Input, Select, Tag, Timeline, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { Evaluation, IncidentType, Event } from './types';

export const labels: Record<string, string> = {
  added: 'Добавлена',
  received: 'Получена службой',
  accepted: 'Принята',
  rejected: 'Не принята',
  responding: 'Начало реагирования',
  arrived: 'Прибытие',
  working: 'Проведение работ',
  completed: 'Работы завершены',
  refused: 'Отказ от выполнения работ',
};
export const date = (v: string) => new Date(v).toLocaleString('ru-RU');
export const time = (seconds: number) =>
  Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0') +
  ':' +
  Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
export function errorText(error: unknown): string {
  const e = error as { data?: { detail?: unknown }; status?: unknown };
  return typeof e?.data?.detail === 'string'
    ? e.data.detail
    : e?.status === 422
      ? 'Проверьте заполнение обязательных полей.'
      : 'Не удалось связаться с сервером. Данные формы сохранены, повторите действие.';
}
export function ErrorPanel({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Alert
      showIcon
      type="error"
      message={errorText(error)}
      action={
        retry ? (
          <Button size="small" icon={<ReloadOutlined />} onClick={retry}>
            Повторить
          </Button>
        ) : undefined
      }
    />
  );
}
export function Status({ value }: { value: string }) {
  return (
    <Tag
      color={
        value === 'completed'
          ? 'success'
          : ['refused', 'rejected'].includes(value)
            ? 'error'
            : ['added', 'received'].includes(value)
              ? 'warning'
              : 'processing'
      }
    >
      {labels[value] || value}
    </Tag>
  );
}
export function CardFields({ types }: { types: IncidentType[] }) {
  return (
    <>
      <div className="form-pair">
        <Form.Item name="caller_number" label="Телефон заявителя" rules={[{ max: 30 }]}>
          <Input maxLength={30} />
        </Form.Item>
        <Form.Item name="name" label="ФИО заявителя" rules={[{ max: 150 }]}>
          <Input maxLength={150} />
        </Form.Item>
      </div>
      <Form.Item
        name="address"
        label="Адрес происшествия"
        rules={[{ required: true, whitespace: true, message: 'Укажите адрес' }]}
      >
        <Input maxLength={500} />
      </Form.Item>
      <Form.Item
        name="incident_type_id"
        label="Тип происшествия"
        rules={[{ required: true, message: 'Выберите тип из классификатора' }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          options={types.map((t) => ({ value: t.id, label: t.name + ' · ' + t.external_code }))}
        />
      </Form.Item>
      <Form.Item name="comments" label="Описание происшествия">
        <Input.TextArea rows={4} maxLength={2048} showCount />
      </Form.Item>
    </>
  );
}
export function Result({ result }: { result: Evaluation }) {
  const problems =
    result.critical_errors.length + result.field_errors.length + result.missing_information.length;
  return (
    <div className="evaluation">
      <div className="section-heading">
        <h3>Результат занятия</h3>
        <Tag color={result.mode === 'local' ? 'green' : 'gold'}>
          {result.mode === 'local'
            ? 'Локальная модель'
            : result.mode === 'fallback'
              ? 'Резервная проверка'
              : 'Учебная проверка'}
        </Tag>
      </div>
      <div className="metrics">
        <div>
          <strong>{problems}</strong>
          <span>замечаний</span>
        </div>
        <div>
          <strong>{time(result.timing.elapsed_seconds)}</strong>
          <span>время занятия</span>
        </div>
        <div>
          <strong>
            {result.timing.acknowledgement_seconds === null
              ? 'Нет'
              : result.timing.acknowledgement_seconds + ' с'}
          </strong>
          <span>подтверждение</span>
        </div>
      </div>
      {problems === 0 ? (
        <Alert type="success" message="По проверяемым критериям замечаний нет" showIcon />
      ) : null}
      {result.critical_errors.map((s, i) => (
        <Alert key={i} type="error" showIcon message={s} />
      ))}
      {result.field_errors.map((s, i) => (
        <Alert
          key={i}
          type="warning"
          message={
            (s.field === 'address' ? 'Адрес' : 'Тип происшествия') +
            ': значение отличается от эталона'
          }
          description={'Эталон: ' + String(s.expected)}
        />
      ))}
      {result.missing_information.length > 0 ? (
        <Alert
          type="warning"
          message="Ожидаемые действия не зарегистрированы"
          description={result.missing_information.map((s) => labels[s] || s).join(', ')}
        />
      ) : null}
      <Typography.Paragraph type="secondary">{result.explanation}</Typography.Paragraph>
      <div className="muted">
        Проверка: {result.model_version} · Эталон: {result.reference_version}
      </div>
    </div>
  );
}
export function History({ events }: { events: Event[] }) {
  const names: Record<string, string> = {
    incoming: 'Получено учебное сообщение',
    opened: 'Карточка открыта',
    updated: 'Данные сохранены',
    created: 'Карточка создана',
    finished: 'Занятие завершено',
    deleted: 'Карточка удалена',
  };
  const phone: Record<string, string> = {
    ring: 'Входящий учебный вызов',
    answer: 'Вызов принят',
    hangup: 'Вызов завершён',
  };
  return (
    <Timeline
      items={[...events].reverse().map((e) => ({
        key: e.id,
        children: (
          <>
            <b>
              {e.kind === 'reaction'
                ? labels[e.payload.status]
                : e.kind === 'communication'
                  ? phone[e.payload.action]
                  : names[e.kind] || e.kind}
            </b>
            <div className="muted">{date(e.created_at)}</div>
            {e.payload.comment ? <p>{e.payload.comment}</p> : null}
          </>
        ),
      }))}
    />
  );
}
