import { Alert, Button, Space, Tag } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

type MapPoint = {
  x: number;
  y: number;
  district: string;
  serviceBase: { x: number; y: number; name: string };
};

const districts = [
  { id: 'szao', label: 'СЗАО', path: 'M270 110 L440 75 L500 190 L390 275 L260 240 Z' },
  { id: 'sao', label: 'САО', path: 'M445 75 L610 90 L600 240 L500 190 Z' },
  { id: 'svao', label: 'СВАО', path: 'M615 95 L760 160 L700 300 L602 238 Z' },
  { id: 'vao', label: 'ВАО', path: 'M704 305 L785 430 L650 505 L560 380 Z' },
  { id: 'uvao', label: 'ЮВАО', path: 'M555 385 L650 510 L520 555 L455 440 Z' },
  { id: 'uao', label: 'ЮАО', path: 'M345 430 L455 440 L520 555 L330 545 L270 470 Z' },
  { id: 'uzao', label: 'ЮЗАО', path: 'M260 355 L345 430 L270 470 L175 390 L205 285 Z' },
  { id: 'zao', label: 'ЗАО', path: 'M205 280 L390 275 L345 425 L260 352 Z' },
  { id: 'cao', label: 'ЦАО', path: 'M390 275 L500 190 L600 240 L560 380 L455 440 L345 425 Z' },
];

const labels: Array<{ text: string; x: number; y: number }> = [
  { text: 'СЗАО', x: 365, y: 185 },
  { text: 'САО', x: 535, y: 150 },
  { text: 'СВАО', x: 682, y: 215 },
  { text: 'ВАО', x: 680, y: 405 },
  { text: 'ЮВАО', x: 545, y: 480 },
  { text: 'ЮАО', x: 375, y: 500 },
  { text: 'ЮЗАО', x: 260, y: 390 },
  { text: 'ЗАО', x: 300, y: 325 },
  { text: 'ЦАО', x: 485, y: 330 },
];

const radials = [
  { name: 'Ленинградское', x1: 505, y1: 330, x2: 500, y2: 48 },
  { name: 'Ярославское', x1: 512, y1: 330, x2: 735, y2: 95 },
  { name: 'Рязанское', x1: 520, y1: 340, x2: 815, y2: 455 },
  { name: 'Варшавское', x1: 495, y1: 350, x2: 380, y2: 590 },
  { name: 'Ленинский', x1: 485, y1: 345, x2: 245, y2: 555 },
  { name: 'Кутузовский', x1: 480, y1: 330, x2: 145, y2: 315 },
];

function hashAddress(value: string) {
  return Array.from(value).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 997, 17);
}

function locateIncident(address: string): MapPoint {
  const lower = address.toLowerCase();
  const candidates: Array<[RegExp, MapPoint]> = [
    [
      /медвед|отрад|свао|ярослав/i,
      { x: 660, y: 230, district: 'СВАО', serviceBase: { x: 615, y: 275, name: 'Упр. СВАО' } },
    ],
    [
      /чертан|юао|варшав/i,
      { x: 405, y: 485, district: 'ЮАО', serviceBase: { x: 450, y: 430, name: 'Упр. ЮАО' } },
    ],
    [
      /печатник|ювао|рязан/i,
      { x: 555, y: 465, district: 'ЮВАО', serviceBase: { x: 520, y: 415, name: 'Упр. ЮВАО' } },
    ],
    [
      /донск|ленинск|юзао|ясен/i,
      { x: 285, y: 405, district: 'ЮЗАО', serviceBase: { x: 350, y: 420, name: 'Упр. ЮЗАО' } },
    ],
    [
      /савел|сао|ленинград/i,
      { x: 510, y: 150, district: 'САО', serviceBase: { x: 505, y: 245, name: 'Упр. САО' } },
    ],
    [
      /соколь|вао|перов/i,
      { x: 690, y: 375, district: 'ВАО', serviceBase: { x: 595, y: 365, name: 'Упр. ВАО' } },
    ],
    [
      /преснен|арбат|цао|казанск|комсомоль/i,
      { x: 500, y: 330, district: 'ЦАО', serviceBase: { x: 470, y: 340, name: 'Упр. ЦАО' } },
    ],
    [
      /кунцев|зао|кутуз/i,
      { x: 285, y: 320, district: 'ЗАО', serviceBase: { x: 375, y: 325, name: 'Упр. ЗАО' } },
    ],
    [
      /тушин|сзао/i,
      { x: 355, y: 190, district: 'СЗАО', serviceBase: { x: 410, y: 260, name: 'Упр. СЗАО' } },
    ],
  ];
  const match = candidates.find(([pattern]) => pattern.test(lower));
  if (match) return match[1];

  const seed = hashAddress(lower || 'moscow');
  return {
    x: 300 + (seed % 360),
    y: 175 + ((seed * 7) % 300),
    district: lower.includes('моск') ? 'Москва' : 'учебная точка',
    serviceBase: { x: 490, y: 335, name: 'ДДС района' },
  };
}

export function MapPanel({ address }: { address: string }) {
  const point = locateIncident(address);
  const route = `M ${point.serviceBase.x} ${point.serviceBase.y} Q ${(point.serviceBase.x + point.x) / 2} ${Math.min(point.serviceBase.y, point.y) - 90} ${point.x} ${point.y}`;

  return (
    <div className="arm-map-panel" data-testid="arm-map-panel">
      <div className="arm-map-head">
        <div>
          <b>Карта происшествия</b>
          <span>{address || 'Адрес не заполнен'}</span>
        </div>
        <Space>
          <Tag color="green">offline</Tag>
          <Tag color="blue">Москва</Tag>
          <Tag color="default">open-data ready</Tag>
        </Space>
      </div>
      <Alert
        type="success"
        showIcon
        message="Локальная карта Москвы"
        description="Внешние API не используются. Сейчас отображается встроенная учебная схема; позднее сюда можно положить локальный OSM/PMTiles/MBTiles-пакет без изменения рабочего места диспетчера."
      />
      <div
        className="arm-map-local"
        data-testid="arm-offline-map"
        role="img"
        aria-label="Локальная учебная карта Москвы"
      >
        <svg className="arm-map-svg" viewBox="0 0 940 620" aria-hidden="true">
          <defs>
            <pattern id="arm-map-grid" width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#c4cdd1" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="940" height="620" fill="#dfe5e7" />
          <rect width="940" height="620" fill="url(#arm-map-grid)" />
          <path
            className="arm-map-river"
            d="M75 375 C190 315 245 405 345 355 C470 295 520 390 655 342 C735 315 790 345 865 292"
          />
          {districts.map((district) => (
            <path key={district.id} className="arm-map-district" d={district.path} />
          ))}
          <ellipse
            className="arm-map-ring arm-map-ring-outer"
            cx="485"
            cy="325"
            rx="385"
            ry="265"
          />
          <ellipse
            className="arm-map-ring arm-map-ring-middle"
            cx="485"
            cy="325"
            rx="190"
            ry="128"
          />
          <ellipse className="arm-map-ring arm-map-ring-inner" cx="485" cy="325" rx="92" ry="64" />
          {radials.map((road) => (
            <line
              key={road.name}
              className="arm-map-road"
              x1={road.x1}
              y1={road.y1}
              x2={road.x2}
              y2={road.y2}
            />
          ))}
          <path className="arm-map-service-route" d={route} />
          <circle
            className="arm-map-base"
            cx={point.serviceBase.x}
            cy={point.serviceBase.y}
            r="11"
          />
          <circle className="arm-map-pin-halo" cx={point.x} cy={point.y} r="24" />
          <circle className="arm-map-pin-core" cx={point.x} cy={point.y} r="11" />
          {labels.map((label) => (
            <text key={label.text} className="arm-map-label" x={label.x} y={label.y}>
              {label.text}
            </text>
          ))}
        </svg>
        <div className="arm-map-card">
          <b>
            <EnvironmentOutlined /> Точка происшествия
          </b>
          <span>{address || 'Адрес будет подставлен из карточки'}</span>
          <small>
            Район: {point.district}; опорная служба: {point.serviceBase.name}. Данные не покидают
            локальный контур.
          </small>
        </div>
      </div>
      <div className="arm-map-actions">
        <Button disabled>маршрут служб</Button>
        <Button disabled>район выезда</Button>
        <Button disabled>локальный OSM-слой</Button>
      </div>
    </div>
  );
}
