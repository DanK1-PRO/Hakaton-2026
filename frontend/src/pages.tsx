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
import type { Incident, Scenario } from './types';
export { Workspace } from './workspace';
export { Results, Users } from './results';
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
          <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Создать карточку
          </Button>
          <Button
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
        scroll={{ x: 1020 }}
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
            width: 120,
            render: (v: string, row: Incident) => <Link to={'/incidents/' + row.id}>{v}</Link>,
          },
          { title: 'Поступило', dataIndex: 'created_at', width: 158, render: date },
          { title: 'Тип происшествия', dataIndex: 'incident_type', width: 240 },
          { title: 'Адрес', dataIndex: 'address' },
          {
            title: 'Заявитель',
            dataIndex: 'name',
            width: 170,
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
            width: 190,
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
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ПРАКТИЧЕСКАЯ ПОДГОТОВКА</div>
          <h1>Учебные задания</h1>
        </div>
        <Tag color="gold">Синтетические учебные данные</Tag>
      </div>
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
