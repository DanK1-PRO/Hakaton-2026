import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Route, Routes, useLocation, useNavigate, Link } from 'react-router-dom';
import { Alert, Button, Checkbox, Form, Input, Layout, Menu, Spin, Tag, Tooltip } from 'antd';
import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  LogoutOutlined,
  PhoneOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { api, signedIn, signedOut, setUser, type RootState } from './store';
import { ErrorPanel } from './components';
import { IncidentList, Workspace, Training, Results, Users } from './pages';
function Login() {
  const dispatch = useDispatch();
  const [login, { isLoading }] = api.useLoginMutation();
  const [error, setError] = useState<unknown>();
  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="brand-mark">
          <PhoneOutlined />
        </div>
        <b>ДДС</b>
        <span>Учебный комплекс</span>
      </div>
      <main className="login-form">
        <div className="eyebrow">АРМ ДИСПЕТЧЕРА</div>
        <h1>Вход в систему</h1>
        {error ? <ErrorPanel error={error} /> : null}
        <Form
          layout="vertical"
          initialValues={{ email: 'trainee@dds.local', remember: false }}
          onFinish={async (v) => {
            setError(undefined);
            try {
              const r = await login({ username: v.email, password: v.password }).unwrap();
              dispatch(signedIn({ token: r.access_token, user: r.user, remember: !!v.remember }));
            } catch (e) {
              setError(e);
            }
          }}
        >
          <Form.Item
            label="Электронная почта"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Введите электронную почту' }]}
          >
            <Input size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password size="large" autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Запомнить меня</Checkbox>
          </Form.Item>
          <Button htmlType="submit" type="primary" size="large" block loading={isLoading}>
            Войти
          </Button>
        </Form>
        <div className="login-footer">
          <SafetyCertificateOutlined /> Локальный учебный контур
        </div>
      </main>
      <footer>Подготовка диспетчеров дежурно-диспетчерских служб · 2026</footer>
    </div>
  );
}
function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const { data: me, error, isLoading } = api.useMeQuery();
  const { data: ml } = api.useMlQuery(undefined, { pollingInterval: 30000 });
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    if (me) dispatch(setUser(me));
  }, [me, dispatch]);
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const logout = () => {
    dispatch(signedOut());
    dispatch(api.util.resetApiState());
    navigate('/');
  };
  if (isLoading || (!user && !error))
    return (
      <div className="full-loading">
        <Spin size="large" />
      </div>
    );
  if (error) return <ErrorPanel error={error} />;
  const role = {
    trainee: 'Обучающийся',
    instructor: 'Преподаватель',
    administrator: 'Администратор',
  }[user!.role];
  const menu = [
    { key: '/incidents', icon: <ProfileOutlined />, label: 'Происшествия' },
    { key: '/training', icon: <BookOutlined />, label: 'Учебные задания' },
    {
      key: '/results',
      icon: <BarChartOutlined />,
      label: user!.role === 'trainee' ? 'Мои результаты' : 'Контроль занятий',
    },
    ...(user!.role === 'administrator'
      ? [{ key: '/users', icon: <TeamOutlined />, label: 'Пользователи' }]
      : []),
  ];
  return (
    <Layout className="app-layout">
      <header className="topbar">
        <Link to="/incidents" className="brand">
          <div className="brand-mark">
            <PhoneOutlined />
          </div>
          <strong>ДДС</strong>
          <span>Учебный комплекс</span>
        </Link>
        <div className="topbar-right">
          <span className="clock">{clock.toLocaleTimeString('ru-RU')}</span>
          <span className="operator">
            {user!.name}
            <small>{role}</small>
          </span>
          <Tooltip title="Выйти">
            <Button aria-label="Выйти" type="text" icon={<LogoutOutlined />} onClick={logout} />
          </Tooltip>
        </div>
      </header>
      <nav className="main-nav">
        <Menu
          mode="horizontal"
          selectedKeys={[
            location.pathname.startsWith('/incidents') ? '/incidents' : location.pathname,
          ]}
          items={menu}
          onClick={({ key }) => navigate(key)}
        />
        <Tag className="local-tag" icon={<ApartmentOutlined />} color="success">
          Локальный контур
        </Tag>
      </nav>
      {ml && !ml.available ? (
        <Alert
          banner
          showIcon
          type="warning"
          message="ML-модуль недоступен. Учебные занятия работают с резервной проверкой."
        />
      ) : null}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/incidents" replace />} />
          <Route path="/incidents" element={<IncidentList />} />
          <Route path="/incidents/:id" element={<Workspace />} />
          <Route path="/training" element={<Training />} />
          <Route path="/results" element={<Results />} />
          <Route
            path="/users"
            element={user!.role === 'administrator' ? <Users /> : <Navigate to="/incidents" />}
          />
          <Route path="*" element={<Navigate to="/incidents" replace />} />
        </Routes>
      </main>
      <footer className="statusbar">
        <span>
          <span className="status-dot" />
          Учебная среда
        </span>
        <span>АРМ ДДС · v0.1.0</span>
        <span>
          {ml?.mode === 'local'
            ? 'Локальный ML'
            : ml?.mode === 'fallback'
              ? 'Резервная проверка'
              : 'Проверка: учебный режим'}
        </span>
      </footer>
    </Layout>
  );
}
export default function App() {
  const token = useSelector((s: RootState) => s.auth.token);
  return token ? <Shell /> : <Login />;
}
