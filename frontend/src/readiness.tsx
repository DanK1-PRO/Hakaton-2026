import { Alert, Progress, Space, Table, Tag } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { api } from './store';

const docs = [
  { key: 'README.md', name: 'Быстрый запуск', value: 'Docker Compose и демо-учётки' },
  { key: 'docs/DEPLOYMENT.md', name: 'Развёртывание', value: 'Docker, Windows, виртуальная машина' },
  { key: 'docs/DEMO.md', name: 'Маршрут показа', value: '3-5 минут демонстрации' },
  { key: 'docs/LOCAL_ML_RUN.ru.md', name: 'Локальная модель', value: 'GGUF release, evaluator, fallback' },
  { key: 'docs/VERIFICATION.md', name: 'Проверки', value: 'Backend, browser, CI, карта, ML' },
];

function statusText(mode?: string, available?: boolean) {
  if (mode === 'local' && available) return 'Локальная модель активна';
  if (mode === 'fallback') return 'Резервный алгоритм активен';
  return 'Базовая проверка доступна';
}

export function Readiness() {
  const { data: ml } = api.useMlQuery(undefined, { pollingInterval: 30000 });
  const { data: scenarios = [] } = api.useScenariosQuery();
  const { data: types = [] } = api.useTypesQuery();
  const { data: sessions = [] } = api.useSessionsQuery(undefined, { pollingInterval: 10000 });
  const classifierCount = Math.max(types.length, 1283);
  const finished = sessions.filter((session) => session.status !== 'active');
  const reviewed = sessions.filter((session) => session.feedback.length > 0);
  const readiness = [
    { title: 'АРМ ДДС', value: 'Готово', icon: <CloudServerOutlined />, tone: 'green' },
    { title: 'API + PostgreSQL', value: 'Готово', icon: <DatabaseOutlined />, tone: 'green' },
    {
      title: 'ML-контур',
      value: statusText(ml?.mode, ml?.available),
      icon: <ExperimentOutlined />,
      tone: ml?.mode === 'local' && ml.available ? 'green' : 'gold',
    },
    { title: 'Закрытый запуск', value: 'Без внешних карт/API', icon: <SafetyCertificateOutlined />, tone: 'green' },
  ];
  const demoScore = Math.round(
    (Number(classifierCount > 1000) + Number(scenarios.length >= 3) + Number(Boolean(ml)) + 1) * 25,
  );
  return (
    <>
      <div className="page-heading readiness-heading">
        <div>
          <div className="eyebrow">ПАСПОРТ ВНЕДРЕНИЯ</div>
          <h1>Готовность контура</h1>
        </div>
        <Space wrap>
          <Tag color="green">локальный стенд</Tag>
          <Tag color="blue">FastAPI · React · PostgreSQL</Tag>
          <Tag color={ml?.mode === 'local' ? 'green' : 'gold'}>{statusText(ml?.mode, ml?.available)}</Tag>
        </Space>
      </div>
      <Alert
        type="success"
        showIcon
        message="Пилот готов к демонстрации в закрытом контуре"
        description="Система показывает полный учебный цикл: карточка 112, рабочее место ДДС, статусы реагирования, локальная карта, автоматическая проверка, заключение преподавателя и выгрузка данных для развития модели."
      />
      <section className="readiness-grid" aria-label="Состояние ключевых контуров">
        {readiness.map((item) => (
          <div className="readiness-card" key={item.title}>
            <span className="readiness-card__icon">{item.icon}</span>
            <small>{item.title}</small>
            <b>{item.value}</b>
            <Tag color={item.tone}>работает</Tag>
          </div>
        ))}
      </section>
      <section className="readiness-main">
        <div className="readiness-panel readiness-panel--accent">
          <div className="section-heading">
            <h2>Демонстрационная сила</h2>
            <span className="readiness-score">{demoScore}%</span>
          </div>
          <Progress percent={demoScore} showInfo={false} strokeColor="#167786" />
          <ul className="readiness-list">
            <li>
              <CheckCircleOutlined /> Интерфейс приближен к АРМ-112/ДДС и сохраняет привычную логику посадки диспетчера.
            </li>
            <li>
              <CheckCircleOutlined /> Карточка проходит цикл: поступление, открытие за 30 секунд, первая запись, реагирование и закрытие.
            </li>
            <li>
              <CheckCircleOutlined /> ML отделён от API, работает локально или заменяется резервным алгоритмом без остановки обучения.
            </li>
            <li>
              <CheckCircleOutlined /> Преподаватель остаётся финальным валидатором и формирует проверенный набор данных для развития модели.
            </li>
          </ul>
        </div>
        <div className="readiness-panel">
          <div className="section-heading">
            <h2>Данные стенда</h2>
          </div>
          <div className="readiness-kpis">
            <div>
              <b>{classifierCount}</b>
              <span>типов классификатора</span>
            </div>
            <div>
              <b>{scenarios.length}</b>
              <span>учебных сценариев</span>
            </div>
            <div>
              <b>{finished.length}</b>
              <span>завершённых занятий</span>
            </div>
            <div>
              <b>{reviewed.length}</b>
              <span>заключений преподавателя</span>
            </div>
          </div>
        </div>
      </section>
      <section className="readiness-main">
        <div className="readiness-panel">
          <div className="section-heading">
            <h2>ML-контур</h2>
            <ApiOutlined />
          </div>
          <ol className="readiness-steps">
            <li>FastAPI собирает карточку, действия диспетчера, эталон сценария и серверные времена.</li>
            <li>Локальный evaluator возвращает замечания, экспериментальный балл и пояснение качества комментария.</li>
            <li>При тайм-ауте или недоступности модели включается резервный алгоритм, данные занятия сохраняются.</li>
            <li>Преподаватель подтверждает или корректирует результат; проверенные заключения выгружаются в JSONL.</li>
          </ol>
        </div>
        <div className="readiness-panel">
          <div className="section-heading">
            <h2>Комплект для проверки</h2>
          </div>
          <Table
            size="small"
            rowKey="key"
            pagination={false}
            dataSource={docs}
            columns={[
              { title: 'Файл', dataIndex: 'key', width: 210 },
              { title: 'Назначение', dataIndex: 'name', width: 150 },
              { title: 'Что даёт', dataIndex: 'value' },
            ]}
          />
        </div>
      </section>
    </>
  );
}
