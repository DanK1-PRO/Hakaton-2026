import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Alert, App, Button, Empty, Form, Input, Modal, Progress, Select, Space, Table, Tag } from 'antd';
import type { ColumnType, ColumnsType } from 'antd/es/table';
import {
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { api, type RootState, store } from './store';
import { ErrorPanel, Result, date, errorText } from './components';
import type { Session } from './types';
export function Results() {
  const user = useSelector((s: RootState) => s.auth.user)!;
  const staff = user.role !== 'trainee';
  const { message } = App.useApp();
  const { data, error, isFetching, refetch } = api.useSessionsQuery(undefined, {
    pollingInterval: 5000,
  });
  const [selected, setSelected] = useState<Session | null>(null);
  const [feedback, { isLoading }] = api.useFeedbackMutation();
  const [form] = Form.useForm();
  const [needle, setNeedle] = useState('');
  const verdicts: Record<string, string> = {
    confirmed: 'Подтверждено',
    corrected: 'Оценка скорректирована',
    review_required: 'Требуется дополнительная проверка',
  };
  const rows = useMemo(() => {
    const all = [...(data ?? [])].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );
    const q = needle.trim().toLowerCase();
    return q ? all.filter((r) => r.trainee.toLowerCase().includes(q)) : all;
  }, [data, needle]);
  const feedbackColumn: ColumnType<Session> = {
    title: 'Заключение преподавателя',
    key: 'feedback',
    width: 220,
    render: (_, r: Session) => {
      const f = r.feedback[r.feedback.length - 1];
      return f ? (
        <>
          <Tag
            color={
              f.verdict === 'confirmed'
                ? 'success'
                : f.verdict === 'corrected'
                  ? 'gold'
                  : 'warning'
            }
          >
            {verdicts[f.verdict]}
          </Tag>
          <div className="muted">{date(f.created_at)}</div>
        </>
      ) : (
        <span className="muted">Нет заключения</span>
      );
    },
  };
  const columns: ColumnsType<Session> = [
    ...(staff
      ? [{ title: 'Обучающийся', dataIndex: 'trainee' }]
      : []),
    { title: 'Задание', dataIndex: 'scenario' },
    { title: 'Начало', dataIndex: 'started_at', render: date },
    {
      title: 'Состояние',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={v === 'active' ? 'blue' : 'green'}>
          {v === 'active' ? 'Идёт занятие' : 'Завершено'}
        </Tag>
      ),
    },
    {
      title: 'Замечания',
      render: (_, r: Session) =>
        r.evaluation
          ? r.evaluation.critical_errors.length +
            r.evaluation.field_errors.length +
            r.evaluation.missing_information.length
          : '—',
    },
    ...(staff ? [feedbackColumn] : []),
    {
      title: 'Действия',
      render: (_, r: Session) => (
        <Space>
          <Link to={'/incidents/' + r.incident_id}>Карточка</Link>
          {r.evaluation ? (
            <Button
              size="small"
              onClick={() => {
                setSelected(r);
                form.resetFields();
              }}
            >
              Результат
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];
  const download = async () => {
    try {
      const r = await fetch('/api/v1/instructor/report.csv', {
        headers: { Authorization: 'Bearer ' + store.getState().auth.token },
      });
      if (!r.ok) throw new Error();
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'training-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Не удалось выгрузить отчёт');
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">УЧЕБНЫЙ ЖУРНАЛ</div>
          <h1>{staff ? 'Контроль занятий' : 'Мои результаты'}</h1>
        </div>
        <Space wrap>
          {staff ? (
            <Input
              aria-label="Поиск по обучающемуся"
              prefix={<SearchOutlined />}
              placeholder="Поиск по обучающемуся"
              allowClear
              value={needle}
              onChange={(e) => setNeedle(e.target.value)}
              style={{ width: 240 }}
            />
          ) : null}
          {staff ? (
            <Button icon={<DownloadOutlined />} onClick={download}>
              Отчёт CSV
            </Button>
          ) : null}
          <Button icon={<ReloadOutlined spin={isFetching} />} onClick={refetch}>
            Обновить
          </Button>
        </Space>
      </div>
      {error ? <ErrorPanel error={error} retry={refetch} /> : null}
      <Table
        rowKey="id"
        dataSource={rows}
        loading={isFetching && !data}
        scroll={{ x: 800 }}
        columns={columns}
        locale={{ emptyText: <Empty description="Занятий пока нет" /> }}
      />
      <Modal
        title="Результат занятия"
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        width={720}
      >
        {selected?.evaluation ? (
          <div className="result-blocks">
            <section>
              <div className="section-heading">
                <h3>Автоматическая оценка</h3>
              </div>
              <Result result={selected.evaluation} />
            </section>
            {selected.feedback.length > 0 ? (
              <section>
                <div className="section-heading">
                  <h3>Заключение преподавателя</h3>
                </div>
                {selected.feedback.map((f) => (
                  <Alert
                    key={f.id}
                    type="info"
                    message={verdicts[f.verdict] || f.verdict}
                    description={
                      <>
                        {f.comment}
                        <div className="muted">{date(f.created_at)}</div>
                      </>
                    }
                  />
                ))}
              </section>
            ) : null}
            {staff ? (
              <section>
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{ verdict: 'confirmed' }}
                  onFinish={async (v) => {
                    try {
                      const s = await feedback({ id: selected.id, ...v }).unwrap();
                      setSelected(s);
                      form.resetFields();
                      message.success('Комментарий сохранён');
                    } catch (e) {
                      message.error(errorText(e));
                    }
                  }}
                >
                  <div className="section-heading">
                    <h3>Проверка преподавателем</h3>
                  </div>
                  <Form.Item name="verdict" label="Решение">
                    <Select
                      options={[
                        { value: 'confirmed', label: 'Подтверждено' },
                        { value: 'corrected', label: 'Оценка скорректирована' },
                        { value: 'review_required', label: 'Требуется дополнительная проверка' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    name="comment"
                    label="Комментарий и правильное действие"
                    rules={[{ required: true, whitespace: true, message: 'Введите комментарий' }]}
                  >
                    <Input.TextArea maxLength={2048} rows={3} />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={isLoading}
                  >
                    Сохранить заключение
                  </Button>
                </Form>
              </section>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
export function Users() {
  const { data, error, refetch } = api.useUsersQuery();
  const [add, { isLoading }] = api.useAddUserMutation();
  const [open, setOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const roleNames: Record<string, string> = {
    trainee: 'Обучающийся',
    instructor: 'Преподаватель',
    administrator: 'Администратор',
  };
  const filtered = roleFilter ? (data ?? []).filter((u) => u.role === roleFilter) : data;
  const strengthChecks = [
    { label: 'Не менее 12 символов', ok: (p: string) => p.length >= 12 },
    { label: 'Заглавные и строчные буквы', ok: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
    { label: 'Цифры', ok: (p: string) => /\d/.test(p) },
    { label: 'Спецсимволы (!@#$%&)', ok: (p: string) => /[!@#$%&]/.test(p) },
  ];
  const watchedPassword: string = Form.useWatch('password', form) || '';
  const [generatedPassword, setGeneratedPassword] = useState('');
  const strengthDone = strengthChecks.filter((c) => c.ok(watchedPassword)).length;
  const strengthLabel =
    strengthDone <= 1 ? 'Слабый' : strengthDone <= 3 ? 'Средний' : 'Надёжный';
  const strengthColor =
    strengthDone <= 1 ? '#cf1322' : strengthDone <= 3 ? '#d48806' : '#338453';
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&';
    let p = '';
    for (let i = 0; i < 14; i += 1) p += chars[Math.floor(Math.random() * chars.length)];
    setGeneratedPassword(p);
    form.setFieldsValue({ password: p, confirm: p });
  };
  return (
    <>
      <div className="page-heading">
        <h1>Пользователи</h1>
        <Space wrap>
          <Select
            aria-label="Фильтр по роли"
            placeholder="Все роли"
            allowClear
            value={roleFilter || undefined}
            onChange={(v) => setRoleFilter(v || '')}
            options={Object.entries(roleNames).map(([value, label]) => ({ value, label }))}
            style={{ width: 200 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Добавить пользователя
          </Button>
        </Space>
      </div>
      {error ? <ErrorPanel error={error} retry={refetch} /> : null}
      <Table
        rowKey="id"
        dataSource={filtered}
        scroll={{ x: 500 }}
        locale={{ emptyText: <Empty description="Пользователей нет" /> }}
        columns={[
          { title: 'Имя', dataIndex: 'name' },
          { title: 'Почта', dataIndex: 'email' },
          {
            title: 'Роль',
            dataIndex: 'role',
            render: (v: string) => (
              <Tag color={v === 'administrator' ? 'red' : v === 'instructor' ? 'blue' : 'default'}>
                {roleNames[v]}
              </Tag>
            ),
          },
        ]}
      />
      <Modal
        title="Новый пользователь"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Создать"
        cancelText="Отмена"
        confirmLoading={isLoading}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: 'trainee' }}
          onFinish={async (v) => {
            try {
              await add({
                name: v.name,
                email: v.email,
                password: v.password,
                role: v.role,
              }).unwrap();
              setOpen(false);
              form.resetFields();
              setGeneratedPassword('');
              message.success('Пользователь создан');
            } catch (e) {
              message.error(errorText(e));
            }
          }}
        >
          <Form.Item name="name" label="Имя" rules={[{ required: true, whitespace: true }]}>
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item name="email" label="Почта" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, min: 12, message: 'Не менее 12 символов' }]}
          >
            <Input.Password maxLength={128} />
          </Form.Item>
          {watchedPassword ? (
            <div className="password-strength" aria-label="Сложность пароля">
              <Progress
                percent={Math.round((strengthDone / strengthChecks.length) * 100)}
                size="small"
                showInfo={false}
                strokeColor={strengthColor}
              />
              <span className="password-strength-label" style={{ color: strengthColor }}>
                {strengthLabel}
              </span>
              <ul className="password-checks">
                {strengthChecks.map((c) => (
                  <li key={c.label} className={c.ok(watchedPassword) ? 'done' : ''}>
                    {c.ok(watchedPassword) ? <CheckOutlined /> : <CloseOutlined />}
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="password-hint">
              Не менее 12 символов: буквы в разных регистрах, цифры и спецсимволы.
            </div>
          )}
          <Form.Item>
            <Button icon={<KeyOutlined />} onClick={generatePassword}>
              Сгенерировать пароль
            </Button>
          </Form.Item>
          {generatedPassword && watchedPassword === generatedPassword ? (
            <div className="password-hint generated">
              Пароль для передачи обучающемуся:{' '}
              <strong>{generatedPassword}</strong>
            </div>
          ) : null}
          <Form.Item
            name="confirm"
            label="Повторите пароль"
            dependencies={['password']}
            rules={[
              { required: true, whitespace: true, message: 'Повторите пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Пароли не совпадают'));
                },
              }),
            ]}
          >
            <Input.Password maxLength={128} />
          </Form.Item>
          <Form.Item name="role" label="Роль">
            <Select
              options={Object.entries(roleNames).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
