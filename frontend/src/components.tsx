import { Alert, Button, Form, Input, Select, Tag, Timeline, Typography } from 'antd';
import { CheckCircleOutlined, ExperimentOutlined, ReloadOutlined } from '@ant-design/icons';
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
  const statusConfig: Record<string, { color: string; icon?: string }> = {
    added: { color: 'warning' },
    received: { color: 'warning' },
    accepted: { color: 'processing' },
    rejected: { color: 'error' },
    responding: { color: 'processing' },
    arrived: { color: 'blue' },
    working: { color: 'processing' },
    completed: { color: 'success' },
    refused: { color: 'error' },
  };
  const config = statusConfig[value] || { color: 'default' };
  return <Tag color={config.color}>{labels[value] || value}</Tag>;
}
export function CardFields({
  types,
  ddsMode = false,
}: {
  types: IncidentType[];
  ddsMode?: boolean;
}) {
  return (
    <>
      {ddsMode ? (
        <Alert
          type="info"
          showIcon
          message="Учебное дополнение ДДС"
          description="Исходные данные заявителя, адрес и тип происшествия заполняет оператор 112. ДДС добавляет собственное описание, статусы и комментарии. Об ошибках исходной карты сообщают в 112 по телефону."
        />
      ) : null}
      <div className="form-pair">
        <Form.Item name="caller_number" label="Телефон заявителя" rules={[{ max: 30 }]}>
          <Input maxLength={30} disabled={ddsMode} />
        </Form.Item>
        <Form.Item name="name" label="ФИО заявителя" rules={[{ max: 150 }]}>
          <Input maxLength={150} disabled={ddsMode} />
        </Form.Item>
      </div>
      <Form.Item
        name="address"
        label="Адрес происшествия"
        rules={[{ required: true, whitespace: true, message: 'Укажите адрес' }]}
      >
        <Input maxLength={500} disabled={ddsMode} />
      </Form.Item>
      <Form.Item
        name="incident_type_id"
        label="Тип происшествия"
        rules={[{ required: true, message: 'Выберите тип из классификатора' }]}
      >
        <Select
          disabled={ddsMode}
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
  const modeLabel =
    result.mode === 'local'
      ? 'Локальная модель'
      : result.mode === 'fallback'
        ? 'Резервный алгоритм'
        : 'Базовая проверка';
  const commentQuality = result.comment_quality;
  const strengths = commentQuality?.strengths ?? [];
  const improvements = commentQuality?.improvements ?? [];
  const commentStatus =
    commentQuality?.status === 'model_assessed'
      ? 'Комментарий оценен моделью'
      : commentQuality?.status === 'unavailable'
        ? 'Комментарий проверен резервно'
        : 'Комментарий проверяет преподаватель';
  return (
    <div className="evaluation">
      <div className="section-heading">
        <h3>Результат занятия</h3>
        <Tag color={result.mode === 'local' ? 'green' : 'gold'}>{modeLabel}</Tag>
      </div>
      <div className="metrics">
        <div>
          <strong>{result.score === null ? '—' : result.score.toFixed(1)}</strong>
          <span>экспериментальный балл</span>
        </div>
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
              ? 'Не открыта'
              : result.timing.acknowledgement_seconds + ' с'}
          </strong>
          <span>получение карточки</span>
        </div>
        <div>
          <strong>
            {result.timing.first_response_seconds === undefined ||
            result.timing.first_response_seconds === null
              ? 'Не внесена'
              : result.timing.first_response_seconds + ' с'}
          </strong>
          <span>первая запись статуса</span>
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
      <section className="ml-insight" aria-label="Пояснение автоматической проверки">
        <div className="ml-insight__head">
          <ExperimentOutlined />
          <div>
            <b>{commentStatus}</b>
            <span>{result.model_version}</span>
          </div>
        </div>
        {commentQuality?.explanation ? <p>{commentQuality.explanation}</p> : null}
        {strengths.length || improvements.length ? (
          <div className="ml-insight__grid">
            {strengths.length ? (
              <div>
                <b>Сильные стороны</b>
                <ul>
                  {strengths.map((item) => (
                    <li key={item}>
                      <CheckCircleOutlined /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {improvements.length ? (
              <div>
                <b>Что улучшить</b>
                <ul>
                  {improvements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
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
  const kindColors: Record<string, string> = {
    incoming: 'blue',
    opened: 'green',
    updated: 'orange',
    created: 'gray',
    finished: 'green',
    deleted: 'red',
    reaction: 'blue',
    communication: 'cyan',
  };
  return (
    <Timeline
      items={[...events].reverse().map((e) => ({
        key: e.id,
        color: kindColors[e.kind] || 'gray',
        children: (
          <>
            <b>
              {e.kind === 'reaction'
                ? labels[e.payload.status]
                : e.kind === 'communication'
                  ? phone[e.payload.action]
                  : names[e.kind] || e.kind}
            </b>
            <div className="muted">
              {e.actor_name ? `оп. ${e.actor_name} · ` : ''}
              {date(e.created_at)}
            </div>
            {e.payload.comment ? <p>{e.payload.comment}</p> : null}
          </>
        ),
      }))}
    />
  );
}
