import { Alert, Button, Space, Tag } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

export function MapPanel({ address }: { address: string }) {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  const yandexConfigured = Boolean((env.VITE_YANDEX_MAPS_API_KEY || '').trim());
  return (
    <div className="arm-map-panel" data-testid="arm-map-panel">
      <div className="arm-map-head">
        <div>
          <b>Карта происшествия</b>
          <span>{address || 'Адрес не заполнен'}</span>
        </div>
        <Space>
          <Tag color="default">mock</Tag>
          {yandexConfigured ? <Tag color="orange">Yandex locked</Tag> : null}
        </Space>
      </div>
      <Alert
        type="info"
        showIcon
        message="Учебная карта работает локально"
        description={
          yandexConfigured
            ? 'Ключ Яндекс.Карт найден, но внешний режим не включён: адреса происшествий не отправляются стороннему сервису без отдельного разрешения.'
            : 'Для реального провайдера позже можно добавить VITE_YANDEX_MAPS_API_KEY и отдельное подтверждение передачи адреса во внешний сервис.'
        }
      />
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
          <b>Точка происшествия</b>
          <span>{address || 'Адрес будет подставлен из карточки'}</span>
        </div>
      </div>
      <div className="arm-map-actions">
        <Button disabled>геокодировать</Button>
        <Button disabled>маршрут служб</Button>
        <Button disabled>район выезда</Button>
      </div>
    </div>
  );
}
