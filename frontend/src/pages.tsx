import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  App,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import {
  ClearOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { api } from './store';
import { CardFields, ErrorPanel, Status, date, errorText } from './components';
import { DDS_PROFILES, DEFAULT_PROFILE_ID, type DdsProfile } from './domain/ddsProfiles';
import type { Incident, Scenario } from './types';
export { Workspace } from './workspace';
export { Results, Users } from './results';

const PROFILE_STORAGE_KEY = 'dds_profile_id';

function loadProfileId(): string {
  try {
    return localStorage.getItem(PROFILE_STORAGE_KEY) || DEFAULT_PROFILE_ID;
  } catch {
    return DEFAULT_PROFILE_ID;
  }
}

function saveProfileId(id: string) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}
export function IncidentList() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [typeId, setTypeId] = useState<number>();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const { data, error, isFetching, refetch } = api.useIncidentsQuery(
    { q: search, status, page, sort, ...(typeId ? { type_id: typeId } : {}) },
    { pollingInterval: 5000 },
  );
  const { data: types = [] } = api.useTypesQuery();
  const [create, { isLoading }] = api.useCreateMutation();
  const labels: Record<string, string> = {
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
  const hasFilters = Boolean(search || status || typeId) || sort !== 'newest';
  const clearAll = () => {
    setQ('');
    setSearch('');
    setStatus('');
    setTypeId(undefined);
    setSort('newest');
    setPage(1);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">РАБОЧЕЕ МЕСТО</div>
          <h1>Поиск происшествий</h1>
        </div>
        <Space wrap>
          <Button
            className="arm-create-card"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Создать карточку
          </Button>
          <Button
            className="arm-training-start"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => navigate('/training')}
          >
            Начать занятие
          </Button>
        </Space>
      </div>
      <section className="search-band">
        <Input
          aria-label="Поиск происшествий"
          prefix={<SearchOutlined />}
          placeholder="Адрес, описание, телефон или номер"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (!e.target.value) {
              setSearch('');
              setPage(1);
            }
          }}
          onPressEnter={() => {
            setSearch(q);
            setPage(1);
          }}
          allowClear
        />
        <Button
          onClick={() => {
            setSearch(q);
            setPage(1);
          }}
        >
          Найти
        </Button>
        <Select
          aria-label="Статус службы"
          placeholder="Все статусы"
          allowClear
          value={status || undefined}
          onChange={(v) => {
            setStatus(v || '');
            setPage(1);
          }}
          options={Object.entries(labels).map(([value, label]) => ({ value, label }))}
        />
        <Select
          aria-label="Фильтр типа происшествия"
          showSearch
          optionFilterProp="label"
          placeholder="Все типы происшествий"
          allowClear
          value={typeId}
          onChange={(v) => {
            setTypeId(v);
            setPage(1);
          }}
          options={types.map((t) => ({ value: t.id, label: t.name + ' · ' + t.external_code }))}
        />
        <Tooltip title="Обновить">
          <Button
            aria-label="Обновить"
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={refetch}
          />
        </Tooltip>
      </section>
      {hasFilters ? (
        <div className="filter-bar">
          <span className="filter-bar-label">
            <FilterOutlined /> Фильтры:
          </span>
          {search ? (
            <Tag
              closable
              onClose={() => {
                setSearch('');
                setQ('');
                setPage(1);
              }}
            >
              Поиск: {search}
            </Tag>
          ) : null}
          {status ? (
            <Tag
              closable
              onClose={() => {
                setStatus('');
                setPage(1);
              }}
            >
              Статус: {labels[status]}
            </Tag>
          ) : null}
          {typeId ? (
            <Tag
              closable
              onClose={() => {
                setTypeId(undefined);
                setPage(1);
              }}
            >
              Тип: {types.find((t) => t.id === typeId)?.name}
            </Tag>
          ) : null}
          {sort !== 'newest' ? (
            <Tag
              closable
              onClose={() => {
                setSort('newest');
                setPage(1);
              }}
            >
              Порядок: {sort === 'oldest' ? 'Сначала ранние' : sort}
            </Tag>
          ) : null}
          <Button type="link" size="small" icon={<ClearOutlined />} onClick={clearAll}>
            Сбросить
          </Button>
        </div>
      ) : null}
      {error ? <ErrorPanel error={error} retry={refetch} /> : null}
      <div className="section-heading">
        <h2>
          Список происшествий <span className="count">{data?.total ?? 0}</span>
        </h2>
        <Select
          aria-label="Порядок сортировки"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'newest', label: 'Сначала новые' },
            { value: 'oldest', label: 'Сначала ранние' },
          ]}
        />
      </div>
      <Table
        rowKey="id"
        className="incident-table"
        dataSource={data?.items}
        loading={isFetching && !data}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          total: data?.total,
          pageSize: 10,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => 'Всего: ' + total,
        }}
        rowClassName={(row) => (row.overdue && !row.acknowledged_at ? 'overdue-row' : '')}
        expandable={{
          expandedRowRender: (row) => (
            <div className="expanded-description">
              <b>Описание: </b>
              {row.comments}
            </div>
          ),
        }}
        locale={{
          emptyText: (
            <Empty
              description={
                search || status || typeId
                  ? 'По заданным условиям ничего не найдено'
                  : 'Происшествий пока нет'
              }
            >
              <Button type="primary" onClick={() => navigate('/training')}>
                Выбрать учебное задание
              </Button>
            </Empty>
          ),
        }}
        columns={[
          {
            title: 'Номер',
            dataIndex: 'number',
            width: 110,
            render: (v: string, row: Incident) => <Link to={'/incidents/' + row.id}>{v}</Link>,
          },
          {
            title: 'Дата',
            dataIndex: 'created_at',
            width: 100,
            render: (v: string) => new Date(v).toLocaleDateString('ru-RU'),
          },
          {
            title: 'Время',
            dataIndex: 'created_at',
            width: 90,
            render: (v: string) =>
              new Date(v).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
          },
          { title: 'Тип происшествия', dataIndex: 'incident_type', width: 230 },
          { title: 'Адрес', dataIndex: 'address' },
          {
            title: 'Заявитель',
            dataIndex: 'name',
            width: 160,
            render: (v: string, row: Incident) => (
              <>
                {v}
                <div className="muted">{row.caller_number}</div>
              </>
            ),
          },
          {
            title: 'Статус службы',
            dataIndex: 'status',
            width: 180,
            render: (v: string, row: Incident) => (
              <>
                <Status value={v} />
                {row.overdue && !row.acknowledged_at ? (
                  <div className="danger">
                    <ClockCircleOutlined /> Более 30 с
                  </div>
                ) : null}
              </>
            ),
          },
          {
            title: '',
            key: 'open',
            width: 56,
            render: (_, row: Incident) => (
              <Tooltip title="Открыть карточку">
                <Button
                  aria-label={'Открыть ' + row.number}
                  icon={<EyeOutlined />}
                  onClick={() => navigate('/incidents/' + row.id)}
                />
              </Tooltip>
            ),
          },
        ]}
      />
      <Modal
        title="Новая учебная карточка"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={isLoading}
        okText="Создать"
        cancelText="Отмена"
        width={640}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            try {
              const card = await create(values).unwrap();
              setCreateOpen(false);
              form.resetFields();
              navigate('/incidents/' + card.id);
            } catch (e) {
              message.error(errorText(e));
            }
          }}
        >
          <CardFields types={types} />
        </Form>
      </Modal>
    </>
  );
}
export function Training() {
  const { data, error, isLoading, refetch } = api.useScenariosQuery();
  const [start, { isLoading: starting }] = api.useStartMutation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [profileId, setProfileId] = useState<string>(loadProfileId);
  const profile: DdsProfile | undefined =
    DDS_PROFILES.find((p) => p.id === profileId) ?? DDS_PROFILES[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ПРАКТИЧЕСКАЯ ПОДГОТОВКА</div>
          <h1>Учебные задания</h1>
        </div>
        <Tag color="gold">Синтетические учебные данные</Tag>
      </div>
      <section className="profile-band" data-testid="dds-profile-band" aria-label="Профиль моей ДДС">
        <div className="profile-band__head">
          <span className="profile-band__label">Профиль моей ДДС</span>
          <Select
            aria-label="Выбрать профиль ДДС"
            data-testid="dds-profile-select"
            value={profileId}
            style={{ minWidth: 280 }}
            options={DDS_PROFILES.map((p) => ({ value: p.id, label: p.title }))}
            onChange={(value: string) => {
              setProfileId(value);
              saveProfileId(value);
            }}
          />
        </div>
        {profile ? (
          <div className="profile-band__grid">
            <div className="profile-band__cell">
              <div className="profile-band__key">Зона ответственности</div>
              <div className="profile-band__val">{profile.zoneDefault}</div>
              <ul className="profile-band__zones">
                {profile.zones.map((z) => (
                  <li key={z}>{z}</li>
                ))}
              </ul>
            </div>
            <div className="profile-band__cell">
              <div className="profile-band__key">Наше реагирование</div>
              <div className="profile-band__val">{profile.ownReaction}</div>
              <div className="profile-band__key">Типичный отказ</div>
              <div className="profile-band__val">{profile.typicalReject}</div>
            </div>
            <div className="profile-band__cell">
              <div className="profile-band__key">На что обратить внимание в опросе</div>
              <ul className="profile-band__focus">
                {profile.clarifyFocus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <div className="profile-band__note">
          Справочник вариантов · TEAM_PROPOSAL · не является приказом заказчика
        </div>
      </section>
      {error ? <ErrorPanel error={error} retry={refetch} /> : null}
      {isLoading ? <Spin /> : null}
      {data && data.length === 0 ? (
        <Empty description="Учебные задания появятся позже" />
      ) : (
        <div className="scenario-grid">
          {data?.map((s: Scenario, i) => (
            <article className="scenario" key={s.id}>
              <div className="scenario-top">
                <span className="scenario-number">{String(i + 1).padStart(2, '0')}</span>
                <Tag color={s.difficulty === 'easy' ? 'green' : 'gold'}>
                  {s.difficulty === 'easy' ? 'Базовый' : 'Средний'}
                </Tag>
              </div>
              <h2>{s.title}</h2>
              <p>{s.prompt}</p>
              <div className="scenario-meta">
                <FileTextOutlined /> Памятка ДДС · стр. {s.source.page}
              </div>
              <div className="scenario-meta">
                <ClockCircleOutlined /> Подтверждение карточки: 30 с
              </div>
              {s.expected_hint ? (
                <div className="scenario-meta scenario-hint" data-testid="scenario-expected-hint">
                  Методподсказка · ожидаемая линия: <b>{s.expected_hint}</b>
                </div>
              ) : null}
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={starting}
                onClick={async () => {
                  try {
                    const card = await start(s.id).unwrap();
                    navigate('/incidents/' + card.id);
                  } catch (e) {
                    message.error(errorText(e));
                  }
                }}
              >
                Начать занятие
              </Button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
