import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Alert, App, Button, Empty, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { DownloadOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
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
        <Space>
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
        dataSource={data}
        loading={isFetching && !data}
        scroll={{ x: 800 }}
        columns={[
          { title: 'Обучающийся', dataIndex: 'trainee' },
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
        ]}
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
          <>
            <Result result={selected.evaluation} />
            {selected.feedback.map((f) => (
              <Alert
                key={f.id}
                type="info"
                message="Замечание преподавателя"
                description={f.comment}
              />
            ))}
            {staff ? (
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
                <h3>Проверка преподавателем</h3>
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
            ) : null}
          </>
        ) : null}
      </Modal>
    </>
  );
}
export function Users() {
  const { data, error, refetch } = api.useUsersQuery();
  const [add, { isLoading }] = api.useAddUserMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  return (
    <>
      <div className="page-heading">
        <h1>Пользователи</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Добавить пользователя
        </Button>
      </div>
      {error ? <ErrorPanel error={error} retry={refetch} /> : null}
      <Table
        rowKey="id"
        dataSource={data}
        scroll={{ x: 500 }}
        columns={[
          { title: 'Имя', dataIndex: 'name' },
          { title: 'Почта', dataIndex: 'email' },
          {
            title: 'Роль',
            dataIndex: 'role',
            render: (v: string) =>
              ({
                trainee: 'Обучающийся',
                instructor: 'Преподаватель',
                administrator: 'Администратор',
              })[v],
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
              await add(v).unwrap();
              setOpen(false);
              form.resetFields();
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
          <Form.Item name="role" label="Роль">
            <Select
              options={[
                { value: 'trainee', label: 'Обучающийся' },
                { value: 'instructor', label: 'Преподаватель' },
                { value: 'administrator', label: 'Администратор' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
