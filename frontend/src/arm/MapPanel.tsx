import { useState } from 'react';
import { Alert, Button, Checkbox, Input, Space, Tag } from 'antd';
import { EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons';

const storedKey = 'dds:yandex-map-key';
const storedConsent = 'dds:yandex-map-consent';

export function MapPanel({ address }: { address: string }) {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(storedKey) || '');
  const [consent, setConsent] = useState(() => sessionStorage.getItem(storedConsent) === 'yes');
  const [ready, setReady] = useState(false);
  const canEnable = apiKey.trim().length > 0 && consent;

  const enableAccess = () => {
    if (!canEnable) return;
    sessionStorage.setItem(storedKey, apiKey.trim());
    sessionStorage.setItem(storedConsent, 'yes');
    setReady(true);
  };

  return (
    <div className="arm-map-panel" data-testid="arm-map-panel">
      <div className="arm-map-head">
        <div>
          <b>Карта происшествия</b>
          <span>{address || 'Адрес не заполнен'}</span>
        </div>
        <Space>
          <Tag color="default">mock</Tag>
          {ready ? <Tag color="green">Yandex ready</Tag> : <Tag color="orange">локально</Tag>}
        </Space>
      </div>
      <Alert
        type={ready ? 'warning' : 'info'}
        showIcon
        message={
          ready
            ? 'Доступ к внешней карте подготовлен. В этой сборке адрес ещё не отправляется во внешний сервис.'
            : 'Учебная карта работает локально. Для внешней карты сначала подтвердите передачу адреса и внесите ключ.'
        }
        description="Реальная загрузка Яндекс.Карт подключается отдельным разрешённым проходом, чтобы случайно не передать адрес происшествия стороннему сервису."
      />
      <div className="arm-map-consent">
        <Checkbox
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked);
            setReady(false);
            if (!event.target.checked) sessionStorage.removeItem(storedConsent);
          }}
        >
          Разрешаю использовать внешний провайдер карты для адреса этой карточки
        </Checkbox>
        <Input.Password
          aria-label="Ключ Яндекс.Карт"
          placeholder="Вставьте ключ Яндекс.Карт"
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.target.value);
            setReady(false);
          }}
        />
        <Button type="primary" icon={<ReloadOutlined />} disabled={!canEnable} onClick={enableAccess}>
          Подготовить доступ
        </Button>
      </div>
      <div className="arm-map-mock" role="img" aria-label="Учебная схема адреса">
        <div className="arm-map-grid" />
        <div className="arm-map-zone arm-map-zone-one">район</div>
        <div className="arm-map-zone arm-map-zone-two">службы</div>
        <div className="arm-map-route arm-map-route-main" />
        <div className="arm-map-route arm-map-route-side" />
        <div className="arm-map-pin">
          <EnvironmentOutlined />
        </div>
        <div className="arm-map-card">
          <b>{ready ? 'Внешний доступ подготовлен' : 'Точка происшествия'}</b>
          <span>{address || 'Адрес будет подставлен из карточки'}</span>
        </div>
      </div>
      <div className="arm-map-actions">
        <Button disabled>маршрут служб</Button>
        <Button disabled>район выезда</Button>
      </div>
    </div>
  );
}
