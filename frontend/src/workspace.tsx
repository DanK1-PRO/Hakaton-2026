import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert,
  App,
  Button,
  Collapse,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { api, store, type RootState, type AppDispatch } from './store';
import {
  CardFields as CardFieldsForm,
  ErrorPanel,
  History,
  Result,
  Status,
  date,
  errorText,
  labels,
  time,
} from './components';
import type { CardFields, Incident } from './types';
export function Workspace() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user)!;
  const {
    data: card,
    error,
    isLoading,
    refetch,
  } = api.useIncidentQuery(id, { pollingInterval: 5000 });
  const { data: types = [] } = api.useTypesQuery();
  const [openCard] = api.useOpenMutation();
  const [edit, { isLoading: saving }] = api.useEditMutation();
  const [react, { isLoading: reacting }] = api.useReactMutation();
  const [communicate, { isLoading: calling }] = api.useCommunicateMutation();
  const [finish, { isLoading: finishing }] = api.useFinishMutation();
  const [remove] = api.useRemoveMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [form] = Form.useForm<CardFields>();
  const [reactionForm] = Form.useForm();
  const [editVersion, setEditVersion] = useState(0);
  const [reactionVersion, setReactionVersion] = useState(0);
  const [now, setNow] = useState(Date.now());
  const pendingPhone = useRef<Promise<Incident> | null>(null);
  const synchronizeCard = useCallback(
    (updated: Incident) => {
      dispatch(
        api.util.updateQueryData('incident', id, (current) =>
          updated.version >= current.version ? updated : current,
        ),
      );
    },
    [dispatch, id],
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (card?.status === 'added' && card.owner_id === user.id && card.session_status !== 'finished')
      openCard(id)
        .unwrap()
        .then(synchronizeCard)
        .catch((e) => message.error(errorText(e)));
  }, [
    card?.status,
    card?.owner_id,
    card?.session_status,
    id,
    openCard,
    user.id,
    synchronizeCard,
    message,
  ]);
  if (isLoading)
    return (
      <div className="workspace-loading">
        <Spin size="large" />
        <span>Загрузка карточки происшествия...</span>
      </div>
    );
  if (!card)
    return (
      <div className="workspace-empty">
        <ErrorPanel error={error} retry={refetch} />
      </div>
    );
  const own = card.owner_id === user.id;
  const locked =
    ['completed', 'refused'].includes(card.status) || card.session_status === 'finished';
  const elapsed =
    card.acknowledged_at || card.session_status === 'finished'
      ? card.acknowledgement_seconds
      : Math.max(0, (now - new Date(card.created_at).getTime()) / 1000);
  const communications = (card.events || []).filter((e) => e.kind === 'communication');
  const last = communications.at(-1);
  const callState = last?.payload.action || 'hangup';
  const phoneAction = async (action: string) => {
    const operation = communicate({ id, action }).unwrap();
    pendingPhone.current = operation;
    try {
      synchronizeCard(await operation);
    } catch (e) {
      message.error(errorText(e));
    } finally {
      if (pendingPhone.current === operation) pendingPhone.current = null;
    }
  };
  const finishAction = async () => {
    try {
      await finish(card.session_id!).unwrap();
      message.success('Занятие завершено');
    } catch (e) {
      message.error(errorText(e));
    }
  };
  const currentCard = async () => {
    if (pendingPhone.current) await pendingPhone.current;
    return api.endpoints.incident.select(id)(store.getState()).data || card;
  };
  const editModal = async () => {
    try {
      const latest = await currentCard();
      form.setFieldsValue(latest);
      setEditVersion(latest.version);
      setEditOpen(true);
    } catch (e) {
      message.error(errorText(e));
    }
  };
  const reactionModal = async () => {
    try {
      const latest = await currentCard();
      reactionForm.resetFields();
      setReactionVersion(latest.version);
      setReactionOpen(true);
    } catch (e) {
      message.error(errorText(e));
    }
  };
  const acknowledgementLabel = card.acknowledged_at
    ? 'Получение подтверждено'
    : locked
      ? 'Получение не подтверждено'
      : 'Подтвердите получение';
  const routes = card.classification?.routes || [];
  const direct = routes.filter(
    (r) => !r.condition && !r.variant && r.value.toLowerCase() !== 'нет реагирования',
  );
  return (
    <>
      <div className="workspace-heading">
        <Space>
          <Tooltip title="К списку">
            <Button
              aria-label="К списку"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/incidents')}
            />
          </Tooltip>
          <div>
            <div className="eyebrow">КАРТОЧКА ПРОИСШЕСТВИЯ</div>
            <h1>№ {card.number}</h1>
          </div>
        </Space>
        <Space wrap>
          <Status value={card.status} />
          {card.session_id &&
          card.session_status === 'active' &&
          (own || user.role !== 'trainee') ? (
            <Popconfirm
              title="Завершить учебное занятие?"
              description="Действия будут переданы на проверку."
              onConfirm={finishAction}
              okText="Завершить"
              cancelText="Продолжить"
            >
              <Button type="primary" icon={<CheckOutlined />} loading={finishing}>
                Завершить занятие
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      </div>
      {error ? <ErrorPanel error={error} retry={refetch} /> : null}
      <section className="phone-strip">
        <div className="phone-state">
          <PhoneOutlined />
          <div>
            <span className={`call-state-indicator ${callState}`}>
              {callState === 'answer'
                ? 'Разговор'
                : callState === 'ring'
                  ? 'Входящий вызов'
                  : 'Телефон'}
            </span>
            <small>Учебная связь</small>
          </div>
          {callState === 'answer' && last ? (
            <span className="timer">
              {time((now - new Date(last.created_at).getTime()) / 1000)}
            </span>
          ) : null}
        </div>
        <div>
          <small>АОН</small>
          <b>{card.caller_number || 'Не определён'}</b>
        </div>
        <div>
          <small>Заявитель</small>
          <b>{card.name || 'Не указан'}</b>
        </div>
        {own && !locked ? (
          <Space>
            {callState === 'hangup' ? (
              <Button
                icon={<PhoneOutlined />}
                loading={calling}
                onClick={() => phoneAction('ring')}
              >
                Учебный вызов
              </Button>
            ) : callState === 'ring' ? (
              <>
                <Button type="primary" loading={calling} onClick={() => phoneAction('answer')}>
                  Принять вызов
                </Button>
                <Button danger loading={calling} onClick={() => phoneAction('hangup')}>
                  Отклонить
                </Button>
              </>
            ) : (
              <Button
                danger
                icon={<CloseOutlined />}
                loading={calling}
                onClick={() => phoneAction('hangup')}
              >
                Завершить вызов
              </Button>
            )}
          </Space>
        ) : null}
      </section>
      <div className="work-grid">
        <section className="incident-info">
          <div className="section-heading">
            <h2>Информация о происшествии</h2>
            {own && !locked ? (
              <Tooltip title="Редактировать карточку">
                <Button
                  aria-label="Редактировать карточку"
                  icon={<EditOutlined />}
                  onClick={editModal}
                  disabled={calling || reacting || saving || finishing}
                />
              </Tooltip>
            ) : null}
          </div>
          <div className="address-block">
            <small>МЕСТО ПРОИСШЕСТВИЯ</small>
            <h3>{card.address}</h3>
          </div>
          <div className="description-block">
            <div className="muted">{date(card.created_at)} · Система-112 · учебное сообщение</div>
            <p>{card.comments || 'Описание не заполнено'}</p>
          </div>
          {card.scenario ? (
            <Collapse
              ghost
              items={[
                {
                  key: 'briefing',
                  label: 'Информация от реагирующей службы',
                  children: (
                    <ul className="briefing">
                      {card.scenario.briefing.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  ),
                },
              ]}
            />
          ) : null}
        </section>
        <section className="classification">
          <div className="section-heading">
            <h2>Классификация</h2>
            <Tag>ЕКП</Tag>
          </div>
          <h3>{card.incident_type}</h3>
          <Space wrap>
            {card.classification?.features.map((v, i) => (
              <Tag key={i}>{v}</Tag>
            ))}
          </Space>
          <div className="source-line">
            Классификатор v046_24 · строка {card.classification?.source.row}
          </div>
          <div className={'ack-box ' + (elapsed > 30 ? 'late' : '')}>
            <ClockCircleOutlined />
            <div>
              <b>{acknowledgementLabel}</b>
              <small>{elapsed.toFixed(1)} с / 30 с</small>
            </div>
            {card.acknowledged_at ? <CheckOutlined /> : null}
          </div>
        </section>
      </div>
      <section className="service-section">
        <div className="section-heading">
          <h2>Реагирование службы</h2>
          <span className="muted">{card.scenario?.service || 'ДДС учебного района'}</span>
        </div>
        <div className="service-current">
          <div>
            <Status value={card.status} />
            <span className="muted">{date(card.updated_at)}</span>
          </div>
          {own && !locked ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={reactionModal}
              disabled={calling || reacting || saving || finishing}
            >
              Изменить статус
            </Button>
          ) : (
            <Tag>
              {card.session_status === 'finished'
                ? 'Занятие завершено'
                : own
                  ? 'Редактирование закрыто'
                  : 'Просмотр преподавателя'}
            </Tag>
          )}
        </div>
        <Collapse
          ghost
          items={[
            {
              key: 'services',
              label: 'Список оповещения и условия классификатора',
              children: (
                <>
                  <Space wrap>
                    {direct.map((r, i) => (
                      <Tag key={i}>{r.service}</Tag>
                    ))}
                  </Space>
                  <Table
                    size="small"
                    pagination={{ pageSize: 6, showSizeChanger: false }}
                    rowKey="column"
                    dataSource={routes}
                    scroll={{ x: 650 }}
                    columns={[
                      { title: 'Служба', dataIndex: 'service' },
                      {
                        title: 'Условие / вариант',
                        render: (_, r) => r.condition || r.variant || 'Без дополнительного условия',
                      },
                      { title: 'Значение', dataIndex: 'value' },
                    ]}
                  />
                </>
              ),
            },
          ]}
        />
      </section>
      <section className="bottom-section">
        <Tabs
          items={[
            {
              key: 'history',
              label: 'История действий',
              children: <History events={card.events || []} />,
            },
            {
              key: 'source',
              label: 'Учебный материал',
              children: card.scenario ? (
                <Descriptions
                  column={1}
                  items={[
                    { key: 's', label: 'Источник', children: card.scenario.source.file },
                    { key: 'p', label: 'Страница', children: card.scenario.source.page },
                    { key: 'n', label: 'Статус эталона', children: card.scenario.source.note },
                  ]}
                />
              ) : (
                <Empty description="Карточка создана вручную" />
              ),
            },
          ]}
        />
      </section>
      {card.evaluation ? (
        <div className="result-shortcut">
          <Result result={card.evaluation} />
          {card.feedback?.map((f) => (
            <Alert
              key={f.id}
              type="info"
              message="Комментарий преподавателя"
              description={f.comment}
            />
          ))}
        </div>
      ) : null}
      {own && !card.session_id ? (
        <Popconfirm
          title="Удалить учебную карточку?"
          onConfirm={async () => {
            try {
              await remove(id).unwrap();
              navigate('/incidents');
            } catch (e) {
              message.error(errorText(e));
            }
          }}
          okText="Удалить"
          cancelText="Отмена"
        >
          <Button danger icon={<DeleteOutlined />}>
            Удалить карточку
          </Button>
        </Popconfirm>
      ) : null}
      <Modal
        title="Редактирование карточки"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => form.submit()}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={saving}
        width={660}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            try {
              synchronizeCard(await edit({ ...v, id, version: editVersion }).unwrap());
              setEditOpen(false);
              message.success('Карточка сохранена');
            } catch (e) {
              message.error(errorText(e));
            }
          }}
        >
          <CardFieldsForm types={types} />
        </Form>
      </Modal>
      <Modal
        title="Статус реагирования"
        open={reactionOpen}
        onCancel={() => setReactionOpen(false)}
        onOk={() => reactionForm.submit()}
        okText="Сохранить статус"
        cancelText="Отмена"
        confirmLoading={reacting}
      >
        <Form
          form={reactionForm}
          layout="vertical"
          onFinish={async (v) => {
            try {
              const updated = await react({
                id,
                version: reactionVersion,
                status: v.status,
                comment: v.comment || '',
              }).unwrap();
              synchronizeCard(updated);
              setReactionOpen(false);
              message.success('Статус сохранён');
            } catch (e) {
              message.error(errorText(e));
            }
          }}
        >
          <Form.Item
            name="status"
            label="Новый статус"
            rules={[{ required: true, message: 'Выберите статус' }]}
          >
            <Select
              options={card.allowed_statuses.map((value) => ({ value, label: labels[value] }))}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(a, b) => a.status !== b.status}>
            {({ getFieldValue }) => (
              <Form.Item
                name="comment"
                label="Комментарий"
                rules={[
                  {
                    required: ['rejected', 'refused'].includes(getFieldValue('status')),
                    whitespace: true,
                    message: 'Укажите причину отказа и сведения о передаче информации',
                  },
                ]}
              >
                <Input.TextArea rows={4} maxLength={2048} showCount />
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
