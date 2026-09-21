import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
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
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { api, store, type RootState, type AppDispatch } from './store';
import {
  CardFields as CardFieldsForm,
  ErrorPanel,
  History,
  Result,
  date,
  errorText,
  labels,
  time,
} from './components';
import { ServiceDock } from './arm/ServiceDock';
import type { CardFields, Incident } from './types';

export function Workspace() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
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
  const [remove, { isLoading: removing }] = api.useRemoveMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [panel, setPanel] = useState<'help' | 'history' | 'routes' | null>(null);
  const [form] = Form.useForm<CardFields>();
  const [reactionForm] = Form.useForm<{ status: string; comment: string }>();
  const [editVersion, setEditVersion] = useState(0);
  const [reactionVersion, setReactionVersion] = useState(0);
  const [writeError, setWriteError] = useState<unknown>();
  const [dirty, setDirty] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pendingPhone = useRef<Promise<Incident> | null>(null);
  const opening = useRef(false);
  const writePending = useRef(false);
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
    if (
      card?.status === 'added' &&
      card.owner_id === user.id &&
      card.session_status !== 'finished' &&
      !opening.current
    ) {
      opening.current = true;
      openCard(id)
        .unwrap()
        .then(synchronizeCard)
        .catch((e) => message.error(errorText(e)))
        .finally(() => {
          opening.current = false;
        });
    }
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
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  if (isLoading)
    return (
      <div className="full-loading">
        <Spin />
      </div>
    );
  if (!card) return <ErrorPanel error={error} retry={refetch} />;
  const own = card.owner_id === user.id;
  const locked =
    ['completed', 'refused'].includes(card.status) || card.session_status === 'finished';
  const busy = calling || reacting || saving || finishing || removing;
  const elapsed =
    card.acknowledged_at || card.session_status === 'finished'
      ? card.acknowledgement_seconds
      : Math.max(0, (now - new Date(card.created_at).getTime()) / 1000);
  const communications = (card.events || []).filter((e) => e.kind === 'communication');
  const last = communications.at(-1);
  const callState = last?.payload.action || 'hangup';
  const routes = card.classification?.routes || [];
  const currentCard = async () => {
    if (pendingPhone.current) await pendingPhone.current;
    return api.endpoints.incident.select(id)(store.getState()).data || card;
  };
  const phoneAction = async (action: string) => {
    if (pendingPhone.current || writePending.current) return;
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
  const editModal = async () => {
    try {
      const latest = await currentCard();
      form.setFieldsValue(latest);
      setEditVersion(latest.version);
      setWriteError(undefined);
      setDirty(false);
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
      setWriteError(undefined);
      setDirty(false);
      setReactionOpen(true);
    } catch (e) {
      message.error(errorText(e));
    }
  };
  const closeEditor = () => {
    if (busy) return;
    const close = () => {
      setEditOpen(false);
      setReactionOpen(false);
      setDirty(false);
      setWriteError(undefined);
    };
    if (dirty)
      modal.confirm({
        title: 'Отменить несохранённые изменения?',
        content: 'Введённые данные ещё не переданы в карточку.',
        okText: 'Отменить изменения',
        cancelText: 'Продолжить редактирование',
        onOk: close,
      });
    else close();
  };
  const reloadEditor = () =>
    modal.confirm({
      title: 'Загрузить актуальную карточку?',
      content: 'Черновик будет заменён сохранёнными на сервере данными.',
      okText: 'Загрузить',
      cancelText: 'Оставить черновик',
      onOk: async () => {
        try {
          const latest = await refetch().unwrap();
          if (editOpen) {
            form.setFieldsValue(latest);
            setEditVersion(latest.version);
          } else {
            reactionForm.resetFields();
            setReactionVersion(latest.version);
          }
          setDirty(false);
          setWriteError(undefined);
        } catch (e) {
          setWriteError(e);
        }
      },
    });
  const stale =
    (editOpen && card.version !== editVersion) ||
    (reactionOpen && card.version !== reactionVersion);
  const editorNotice = (
    <>
      {stale ? (
        <Alert
          type="warning"
          showIcon
          message="Карточка обновилась. Черновик сохранён."
          description="Перед повторной записью требуется сверка с актуальными данными."
          action={
            <Button
              aria-label="Загрузить актуальные данные"
              onClick={reloadEditor}
              icon={<ReloadOutlined />}
            >
              Загрузить актуальные данные
            </Button>
          }
        />
      ) : null}
      {writeError ? <ErrorPanel error={writeError} /> : null}
      {locked ? (
        <Alert type="warning" message="Редактирование закрыто: карточка или занятие завершены." />
      ) : null}
    </>
  );
  const acknowledgementLabel = card.acknowledged_at
    ? 'Получение подтверждено'
    : locked
      ? 'Получение не подтверждено'
      : 'Подтвердите получение';
  return (
    <div className="arm-workspace">
      <div className="arm-training-rail">
        <Space wrap>
          <Tooltip title="К списку происшествий">
            <Button
              aria-label="К списку"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/incidents')}
            />
          </Tooltip>
          <span className="arm-toolbar-title">Карточка происшествия</span>
          <span
            className={'arm-ack ' + (!card.acknowledged_at && elapsed > 30 ? 'arm-ack-late' : '')}
            role="status"
          >
            <ClockCircleOutlined /> {acknowledgementLabel}: {elapsed.toFixed(1)} с / 30 с
          </span>
        </Space>
        <Space wrap>
          <Tooltip title="Сведения о занятии и действии">
            <Button
              className="arm-help-button"
              aria-label="Сведения о занятии"
              icon={<InfoCircleOutlined />}
              onClick={() => setPanel('help')}
            />
          </Tooltip>
          {card.session_id &&
          card.session_status === 'active' &&
          (own || user.role !== 'trainee') ? (
            <Popconfirm
              title="Завершить учебное занятие?"
              description="История будет передана на проверку, редактирование закроется."
              okText="Завершить"
              cancelText="Продолжить"
              onConfirm={async () => {
                if (writePending.current) return;
                writePending.current = true;
                try {
                  await finish(card.session_id!).unwrap();
                  message.success('Занятие завершено');
                } catch (e) {
                  message.error(errorText(e));
                } finally {
                  writePending.current = false;
                }
              }}
            >
              <Button
                className="arm-finish-button"
                icon={<CheckOutlined />}
                loading={finishing}
                disabled={busy || editOpen || reactionOpen}
              >
                Завершить занятие
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      </div>
      {error ? <ErrorPanel error={error} retry={refetch} /> : null}
      <div className="arm-scene" data-testid="arm-scene">
        <section className="arm-phone" aria-label="Телефонная панель">
          <div className="arm-phone-state">
            <PhoneOutlined />
            <div>
              <b>
                {callState === 'answer'
                  ? 'Разговор'
                  : callState === 'ring'
                    ? 'Входящий вызов'
                    : 'Отключение'}
              </b>
              {callState === 'answer' && last ? (
                <span className="timer">
                  {' '}
                  {time(Math.max(0, (now - new Date(last.created_at).getTime()) / 1000))}
                </span>
              ) : null}
              <div className="arm-phone-links">
                <Tooltip title="Аудиозаписи не подключены">
                  <span>
                    <Button size="small" disabled>
                      записи звонков
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="SMS не подключены">
                  <span>
                    <Button size="small" disabled>
                      список SMS
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="arm-phone-field">
            <small>АОН</small>
            <b>{card.caller_number || 'Не определён'}</b>
          </div>
          <div className="arm-phone-field">
            <small>предоставленный</small>
            <span>Нет данных</span>
          </div>
          <div className="arm-phone-field">
            <small>телефон на место</small>
            <span>Нет данных</span>
          </div>
          <div className="arm-identity">
            <h1>{card.number}</h1>
            <small>сохр. {date(card.updated_at)}</small>
            <small>оп. {user.name}</small>
          </div>
          <div className="arm-mode">
            <span>просмотр</span>
            {own && !locked ? (
              <Tooltip title="Дополнение данных происшествия">
                <Button aria-label="Редактировать карточку" onClick={editModal} disabled={busy}>
                  дополнение
                </Button>
              </Tooltip>
            ) : (
              <span className="arm-readonly">только чтение</span>
            )}
          </div>
        </section>
        {own && !locked ? (
          <div className="arm-call-actions">
            <span>Связь</span>
            {callState === 'hangup' ? (
              <Button
                icon={<PhoneOutlined />}
                loading={calling}
                disabled={busy && !calling}
                onClick={() => phoneAction('ring')}
              >
                Учебный вызов
              </Button>
            ) : callState === 'ring' ? (
              <>
                <Button type="primary" loading={calling} onClick={() => phoneAction('answer')}>
                  Принять вызов
                </Button>
                <Button danger disabled={calling} onClick={() => phoneAction('hangup')}>
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
          </div>
        ) : null}
        <div className="arm-details" data-testid="arm-details">
          <section className="arm-left" aria-label="Информация о происшествии">
            <div className="arm-field arm-caller">
              <small>ФИО заявителя</small>
              <span>{card.name || 'Не указано'}</span>
            </div>
            <div className="arm-field arm-address">
              <small>Место происшествия</small>
              <b>{card.address}</b>
              <Tooltip title="Карта не подключена в учебном контуре">
                <Button size="small" disabled>
                  карта
                </Button>
              </Tooltip>
            </div>
            <div className="arm-field arm-description">
              <b>{date(card.created_at)} · Система-112 · учебное сообщение</b>
              <p>{card.comments || 'Описание не заполнено'}</p>
            </div>
          </section>
          <section className="arm-right" aria-label="Классификация">
            <div className="arm-flags">
              <span>Пострадавшие: нет данных</span>
              <span>Отказ от скорой: нет данных</span>
              <span>Заблокированные: нет данных</span>
              <Tooltip title="Признак ЧС не передаётся текущим API">
                <span>
                  <Button disabled icon={<ThunderboltOutlined />}>
                    ЧС
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Признак ЧП не передаётся текущим API">
                <span>
                  <Button disabled icon={<WarningOutlined />}>
                    ЧП
                  </Button>
                </span>
              </Tooltip>
            </div>
            <h2 className="arm-type">Происшествие: {card.incident_type}</h2>
            <div className="arm-field arm-features">
              <small>Формализованные признаки</small>
              {card.classification?.features.length
                ? card.classification.features.join(' . ')
                : 'Признаки не указаны'}
            </div>
            <div className="arm-field">
              <small>Класс.</small>
              <b>{card.incident_type}</b>
            </div>
            <div className="arm-field">
              <Tooltip title="Классификация внешней информационной системы не подключена">
                <span>
                  <small>[ВИС] Класс.</small>
                  нет данных
                </span>
              </Tooltip>
            </div>
            <div className="arm-field arm-training-note">
              <small>Учебное расширение</small>
              Подсказки и результаты доступны через «?». Основные поля расположены как в АРМ.
            </div>
          </section>
        </div>
        <ServiceDock
          card={card}
          own={own}
          locked={locked}
          busy={busy}
          onReact={reactionModal}
          onRoutes={() => setPanel('routes')}
          onHistory={() => setPanel('history')}
        />
      </div>
      {card.evaluation ? (
        <section className="result-shortcut" aria-label="Итоги занятия">
          <Result result={card.evaluation} />
          {card.feedback?.map((f) => (
            <Alert
              key={f.id}
              type="info"
              message="Комментарий преподавателя"
              description={f.comment}
            />
          ))}
        </section>
      ) : null}
      {own && !card.session_id ? (
        <div className="arm-delete">
          <Popconfirm
            title="Удалить учебную карточку?"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={async () => {
              try {
                await remove(id).unwrap();
                navigate('/incidents');
              } catch (e) {
                message.error(errorText(e));
              }
            }}
          >
            <Button danger icon={<DeleteOutlined />} loading={removing}>
              Удалить карточку
            </Button>
          </Popconfirm>
        </div>
      ) : null}
      <Drawer
        width={620}
        title={
          panel === 'history'
            ? 'История действий'
            : panel === 'routes'
              ? 'Список оповещения и условия классификатора'
              : 'Сведения о занятии'
        }
        open={panel !== null}
        onClose={() => setPanel(null)}
      >
        {panel === 'history' ? (
          <History events={card.events || []} />
        ) : panel === 'routes' ? (
          <>
            <Alert
              type="info"
              message="Справочник маршрутизации. Фактическая передача другим службам не выполняется."
            />
            <Table
              size="small"
              rowKey="column"
              dataSource={routes}
              scroll={{ x: 480 }}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              columns={[
                { title: 'Служба', dataIndex: 'service' },
                {
                  title: 'Условие / вариант',
                  render: (_, r) =>
                    [r.condition, r.variant].filter(Boolean).join(' / ') ||
                    'Без дополнительного условия',
                },
                { title: 'Значение', dataIndex: 'value' },
              ]}
            />
            <p>
              Классификатор v046_24 · строка {card.classification?.source.row ?? 'не определена'}
            </p>
          </>
        ) : (
          <Tabs
            items={[
              {
                key: 'context',
                label: 'Занятие',
                children: (
                  <>
                    <Alert
                      type="info"
                      message={
                        own
                          ? locked
                            ? 'Редактирование закрыто'
                            : 'Ваше рабочее место ДДС'
                          : 'Просмотр преподавателя'
                      }
                      description="В этой сессии фиксируются действия одной ДДС. Отображение маршрута не означает, что другие службы уже оповещены."
                    />
                    <h3>Подтверждение получения</h3>
                    <p>
                      «Получена службой» регистрируется при открытии своей карточки. «Принята»
                      подтверждает её принятие. Контрольный срок: 30 секунд с поступления.
                    </p>
                    <h3>Статус и комментарий</h3>
                    <p>
                      Отказ требует причины; сведения о передаче информации указываются при наличии.
                      «Работы завершены» и «Отказ от выполнения работ» закрывают редактирование.
                      История сохраняется после каждого действия.
                    </p>
                    <h3>Учебная связь</h3>
                    <p>
                      Вызов, ответ и завершение фиксируются в журнале. Реальные звонки, аудиозаписи
                      и SMS не подключены.
                    </p>
                    <p className="muted">
                      Памятка АРМ-112 для ДДС, стр. 21–26, 32. Учебные пояснения дополняют рабочее
                      место.
                    </p>
                  </>
                ),
              },
              {
                key: 'source',
                label: 'Учебный материал',
                children: card.scenario ? (
                  <>
                    <h3>{card.scenario.title}</h3>
                    <p>{card.scenario.prompt}</p>
                    <h3>Информация от реагирующей службы</h3>
                    <ul className="briefing">
                      {card.scenario.briefing.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                    <Descriptions
                      column={1}
                      items={[
                        { key: 'file', label: 'Источник', children: card.scenario.source.file },
                        { key: 'page', label: 'Страница', children: card.scenario.source.page },
                        {
                          key: 'note',
                          label: 'Статус эталона',
                          children: card.scenario.source.note,
                        },
                      ]}
                    />
                  </>
                ) : (
                  <Empty description="Карточка создана вручную" />
                ),
              },
            ]}
          />
        )}
      </Drawer>
      <Modal
        title="Редактирование карточки"
        className="arm-edit-modal"
        open={editOpen}
        onCancel={closeEditor}
        maskClosable={false}
        onOk={() => form.submit()}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={saving}
        okButtonProps={{ disabled: locked || stale }}
        width={700}
      >
        {editorNotice}
        <Form
          form={form}
          layout="vertical"
          onValuesChange={() => setDirty(true)}
          onFinish={async (v) => {
            if (writePending.current || locked || stale) return;
            writePending.current = true;
            setWriteError(undefined);
            try {
              synchronizeCard(await edit({ ...v, id, version: editVersion }).unwrap());
              setEditOpen(false);
              setDirty(false);
              message.success('Карточка сохранена');
            } catch (e) {
              setWriteError(e);
              if ((e as { status?: number }).status === 409) void refetch();
            } finally {
              writePending.current = false;
            }
          }}
        >
          <CardFieldsForm types={types} />
        </Form>
      </Modal>
      <Modal
        title="Статус реагирования"
        className="arm-reaction-modal"
        open={reactionOpen}
        onCancel={closeEditor}
        maskClosable={false}
        width={980}
        footer={null}
      >
        {editorNotice}
        <Form
          form={reactionForm}
          layout="vertical"
          className="arm-reaction-form"
          onValuesChange={() => setDirty(true)}
          onFinish={async (v) => {
            if (writePending.current || locked || stale) return;
            writePending.current = true;
            setWriteError(undefined);
            try {
              synchronizeCard(
                await react({
                  id,
                  version: reactionVersion,
                  status: v.status,
                  comment: v.comment || '',
                }).unwrap(),
              );
              setReactionOpen(false);
              setDirty(false);
              message.success('Статус сохранён');
            } catch (e) {
              setWriteError(e);
              if ((e as { status?: number }).status === 409) void refetch();
            } finally {
              writePending.current = false;
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
          <Form.Item label="Оператор">
            <Input value={user.name} readOnly />
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
                    message: 'Укажите причину отказа; передачу информации укажите при наличии',
                  },
                ]}
              >
                <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} maxLength={2048} />
              </Form.Item>
            )}
          </Form.Item>
          <div className="arm-reaction-actions">
            <Tooltip title="Сохранить статус">
              <Button
                type="primary"
                aria-label="Сохранить статус"
                htmlType="submit"
                icon={<CheckOutlined />}
                loading={reacting}
                disabled={locked || stale}
              />
            </Tooltip>
            <Tooltip title="Отмена">
              <Button
                aria-label="Отмена"
                icon={<CloseOutlined />}
                onClick={closeEditor}
                disabled={reacting}
              />
            </Tooltip>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
