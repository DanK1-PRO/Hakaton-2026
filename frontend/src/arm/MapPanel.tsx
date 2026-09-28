/// <reference types="vite/client" />
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Space, Tag } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';

type MapPoint = {
  x: number;
  y: number;
  lat: number;
  lon: number;
  district: string;
  serviceBase: { x: number; y: number; lat: number; lon: number; name: string };
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
      {
        x: 660,
        y: 230,
        lat: 55.857,
        lon: 37.662,
        district: 'СВАО',
        serviceBase: { x: 615, y: 275, lat: 55.84, lon: 37.61, name: 'Упр. СВАО' },
      },
    ],
    [
      /чертан|юао|варшав/i,
      {
        x: 405,
        y: 485,
        lat: 55.64,
        lon: 37.648,
        district: 'ЮАО',
        serviceBase: { x: 450, y: 430, lat: 55.663, lon: 37.664, name: 'Упр. ЮАО' },
      },
    ],
    [
      /печатник|ювао|рязан/i,
      {
        x: 555,
        y: 465,
        lat: 55.694,
        lon: 37.792,
        district: 'ЮВАО',
        serviceBase: { x: 520, y: 415, lat: 55.704, lon: 37.757, name: 'Упр. ЮВАО' },
      },
    ],
    [
      /донск|ленинск|юзао|ясен/i,
      {
        x: 285,
        y: 405,
        lat: 55.706,
        lon: 37.582,
        district: 'ЮЗАО',
        serviceBase: { x: 350, y: 420, lat: 55.663, lon: 37.53, name: 'Упр. ЮЗАО' },
      },
    ],
    [
      /савел|сао|ленинград/i,
      {
        x: 510,
        y: 150,
        lat: 55.79,
        lon: 37.585,
        district: 'САО',
        serviceBase: { x: 505, y: 245, lat: 55.834, lon: 37.567, name: 'Упр. САО' },
      },
    ],
    [
      /соколь|вао|перов/i,
      {
        x: 690,
        y: 375,
        lat: 55.791,
        lon: 37.674,
        district: 'ВАО',
        serviceBase: { x: 595, y: 365, lat: 55.777, lon: 37.69, name: 'Упр. ВАО' },
      },
    ],
    [
      /преснен|арбат|цао|казанск|комсомоль/i,
      {
        x: 500,
        y: 330,
        lat: 55.754,
        lon: 37.621,
        district: 'ЦАО',
        serviceBase: { x: 470, y: 340, lat: 55.757, lon: 37.615, name: 'Упр. ЦАО' },
      },
    ],
    [
      /кунцев|зао|кутуз/i,
      {
        x: 285,
        y: 320,
        lat: 55.73,
        lon: 37.455,
        district: 'ЗАО',
        serviceBase: { x: 375, y: 325, lat: 55.738, lon: 37.516, name: 'Упр. ЗАО' },
      },
    ],
    [
      /тушин|сзао/i,
      {
        x: 355,
        y: 190,
        lat: 55.847,
        lon: 37.438,
        district: 'СЗАО',
        serviceBase: { x: 410, y: 260, lat: 55.804, lon: 37.456, name: 'Упр. СЗАО' },
      },
    ],
  ];
  const match = candidates.find(([pattern]) => pattern.test(lower));
  if (match) return match[1];

  const seed = hashAddress(lower || 'moscow');
  return {
    x: 300 + (seed % 360),
    y: 175 + ((seed * 7) % 300),
    lat: 55.63 + ((seed * 7) % 250) / 1000,
    lon: 37.4 + (seed % 340) / 1000,
    district: lower.includes('моск') ? 'Москва' : 'учебная точка',
    serviceBase: { x: 490, y: 335, lat: 55.755, lon: 37.62, name: 'ДДС района' },
  };
}

function buildGisStyle(origin: string): StyleSpecification {
  const roadWidth: ExpressionSpecification = [
    'interpolate',
    ['exponential', 1.5],
    ['zoom'],
    5,
    0.5,
    10,
    2,
    14,
    9,
    16,
    16,
  ];
  return {
    version: 8,
    name: 'dds-moscow-offline',
    glyphs: origin + '/maps/fonts/{fontstack}/{range}.pbf',
    sources: {
      moscow: { type: 'vector', url: 'pmtiles://' + origin + '/maps/moscow.pmtiles' },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#eeeae2' } },
      {
        id: 'landcover-grass',
        type: 'fill',
        source: 'moscow',
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'forest', 'scrub', 'park']]],
        paint: { 'fill-color': '#cfe3b8', 'fill-opacity': 0.75 },
      },
      {
        id: 'landcover-ice-sand',
        type: 'fill',
        source: 'moscow',
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['ice', 'sand', 'rock']]],
        paint: { 'fill-color': '#e6e2da', 'fill-opacity': 0.7 },
      },
      {
        id: 'landuse-residential',
        type: 'fill',
        source: 'moscow',
        'source-layer': 'landuse',
        filter: [
          'in',
          ['get', 'class'],
          ['literal', ['residential', 'suburb', 'neighbourhood', 'urban']],
        ],
        paint: { 'fill-color': '#e7e2d9', 'fill-opacity': 0.85 },
      },
      {
        id: 'landuse-work',
        type: 'fill',
        source: 'moscow',
        'source-layer': 'landuse',
        filter: [
          'in',
          ['get', 'class'],
          ['literal', ['commercial', 'industrial', 'retail', 'railway', 'quarry', 'depot']],
        ],
        paint: { 'fill-color': '#e4dcd4', 'fill-opacity': 0.85 },
      },
      {
        id: 'landuse-public',
        type: 'fill',
        source: 'moscow',
        'source-layer': 'landuse',
        filter: [
          'in',
          ['get', 'class'],
          [
            'literal',
            [
              'cemetery',
              'hospital',
              'school',
              'university',
              'college',
              'kindergarten',
              'stadium',
              'pitch',
              'track',
              'recreation_ground',
              'education',
              'medical',
            ],
          ],
        ],
        paint: { 'fill-color': '#dcead2', 'fill-opacity': 0.85 },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'moscow',
        'source-layer': 'park',
        paint: { 'fill-color': '#cde6b5', 'fill-opacity': 0.8 },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'moscow',
        'source-layer': 'water',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        paint: { 'fill-color': '#a6cbe8' },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'moscow',
        'source-layer': 'waterway',
        paint: {
          'line-color': '#a6cbe8',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 13, 2.5, 16, 6],
        },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'moscow',
        'source-layer': 'building',
        paint: {
          'fill-color': '#d8d0c4',
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 13, 0.55, 15, 0.9],
        },
      },
      {
        id: 'transportation-casing',
        type: 'line',
        source: 'moscow',
        'source-layer': 'transportation',
        filter: [
          'in',
          ['get', 'class'],
          [
            'literal',
            ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service'],
          ],
        ],
        paint: {
          'line-color': '#c4bcae',
          'line-width': [
            'interpolate',
            ['exponential', 1.5],
            ['zoom'],
            6,
            0.4,
            12,
            3.5,
            14,
            13,
            16,
            20,
          ],
        },
      },
      {
        id: 'transportation',
        type: 'line',
        source: 'moscow',
        'source-layer': 'transportation',
        filter: [
          'in',
          ['get', 'class'],
          [
            'literal',
            [
              'motorway',
              'trunk',
              'primary',
              'secondary',
              'tertiary',
              'minor',
              'service',
              'path',
              'pedestrian',
              'track',
            ],
          ],
        ],
        paint: {
          'line-color': [
            'match',
            ['get', 'class'],
            'motorway',
            '#f4a259',
            'trunk',
            '#f6b26b',
            'primary',
            '#f8cf8f',
            'secondary',
            '#f7e3ae',
            '#ffffff',
          ],
          'line-width': roadWidth,
        },
      },
      {
        id: 'railway',
        type: 'line',
        source: 'moscow',
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['rail', 'transit']]],
        paint: {
          'line-color': '#9c968e',
          'line-width': 1.4,
          'line-dasharray': [3, 3],
        },
      },
      {
        id: 'boundary',
        type: 'line',
        source: 'moscow',
        'source-layer': 'boundary',
        minzoom: 7,
        paint: {
          'line-color': '#a493b8',
          'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.4, 12, 1.4],
          'line-dasharray': [3, 2],
          'line-opacity': 0.8,
        },
      },
      {
        id: 'place-labels',
        type: 'symbol',
        source: 'moscow',
        'source-layer': 'place',
        filter: ['has', 'name'],
        layout: {
          'text-field': ['coalesce', ['get', 'name:ru'], ['get', 'name']],
          'text-font': ['NotoSansRegular'],
          'text-size': [
            'match',
            ['get', 'class'],
            'city',
            17,
            'town',
            14,
            'suburb',
            12,
            'village',
            11,
            10,
          ],
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#333d44',
          'text-halo-color': 'rgba(255,255,255,0.92)',
          'text-halo-width': 1.4,
        },
      },
      {
        id: 'street-labels',
        type: 'symbol',
        source: 'moscow',
        'source-layer': 'transportation_name',
        minzoom: 12,
        filter: ['has', 'name'],
        layout: {
          'text-field': ['coalesce', ['get', 'name:ru'], ['get', 'name']],
          'text-font': ['NotoSansRegular'],
          'text-size': 11,
          'symbol-placement': 'line',
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'viewport',
        },
        paint: {
          'text-color': '#55606a',
          'text-halo-color': 'rgba(255,255,255,0.95)',
          'text-halo-width': 1.2,
        },
      },
    ],
  };
}

function incidentGeoJson(point: MapPoint) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [point.serviceBase.lon, point.serviceBase.lat],
            [point.lon, point.lat],
          ],
        },
        properties: { kind: 'route' },
      },
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [point.serviceBase.lon, point.serviceBase.lat],
        },
        properties: { kind: 'base' },
      },
      {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [point.lon, point.lat] },
        properties: { kind: 'pin' },
      },
    ],
  };
}

type GisMapProps = { address: string; point: MapPoint; onFallback: () => void };

function MoscowGisMap({ address, point, onFallback }: GisMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    let disposed = false;
    let map: import('maplibre-gl').Map | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const fail = () => {
      if (!disposed) onFallback();
    };

    (async () => {
      try {
        const [maplibre, { Protocol }] = await Promise.all([
          import('maplibre-gl'),
          import('pmtiles'),
          import('maplibre-gl/dist/maplibre-gl.css'),
        ]);
        if (disposed || !containerRef.current) return;
        try {
          maplibre.addProtocol('pmtiles', new Protocol().tile);
        } catch {
          if (typeof maplibre.removeProtocol === 'function') {
            maplibre.removeProtocol('pmtiles');
          }
          maplibre.addProtocol('pmtiles', new Protocol().tile);
        }
        const origin = window.location.origin;
        map = new maplibre.Map({
          container: containerRef.current,
          style: buildGisStyle(origin),
          center: [point.lon, point.lat],
          zoom: 12.2,
          minZoom: 8,
          maxZoom: 16,
          attributionControl: false,
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
        map.addControl(
          new maplibre.AttributionControl({
            customAttribution: '© Участники OpenStreetMap (ODbL)',
          }),
          'bottom-right',
        );
        map.on('load', () => {
          if (fallbackTimer) clearTimeout(fallbackTimer);
          if (map && !disposed) {
            map.addSource('incident', { type: 'geojson', data: incidentGeoJson(point) });
            map.addLayer({
              id: 'incident-route',
              type: 'line',
              source: 'incident',
              filter: ['==', ['get', 'kind'], 'route'],
              paint: {
                'line-color': '#ec653b',
                'line-width': 3,
                'line-dasharray': [2, 1.5],
              },
            });
            map.addLayer({
              id: 'incident-base',
              type: 'circle',
              source: 'incident',
              filter: ['==', ['get', 'kind'], 'base'],
              paint: {
                'circle-radius': 7,
                'circle-color': '#1f6f5c',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
              },
            });
            map.addLayer({
              id: 'incident-pin',
              type: 'circle',
              source: 'incident',
              filter: ['==', ['get', 'kind'], 'pin'],
              paint: {
                'circle-radius': 9,
                'circle-color': '#ec653b',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2.5,
              },
            });
            map.resize();
          }
        });
        const resizeObserver = new ResizeObserver(() => {
          if (map && !disposed) map.resize();
        });
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        resizeObserverRef.current = resizeObserver;
        window.setTimeout(() => {
          if (map && !disposed) map.resize();
        }, 400);
        map.on('error', (event) => {
          const message = String((event as { error?: { message?: string } }).error?.message ?? '');
          if (/style|source|protocol|Failed to fetch|NetworkError|pmtiles|tile/i.test(message)) {
            fail();
          }
        });
        if (import.meta.env.DEV) {
          (window as unknown as { __ddsMap?: unknown }).__ddsMap = map;
        }
        fallbackTimer = setTimeout(fail, 12000);
        void address;
      } catch {
        fail();
      }
    })();

    return () => {
      disposed = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map?.remove();
      map = undefined;
    };
  }, [address, point, onFallback]);

  return <div className="arm-map-gis" ref={containerRef} data-testid="arm-map-gis" />;
}

export function MapPanel({ address }: { address: string }) {
  const point = useMemo(() => locateIncident(address), [address]);
  const [packState, setPackState] = useState<'checking' | 'ready' | 'missing'>('checking');
  const handleFallback = useCallback(() => setPackState('missing'), []);

  useEffect(() => {
    let cancelled = false;
    fetch('/maps/moscow.pmtiles', { method: 'HEAD' })
      .then((response) => {
        if (!cancelled) setPackState(response.ok ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setPackState('missing');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const gis = packState === 'ready';
  const route = `M ${point.serviceBase.x} ${point.serviceBase.y} Q ${(point.serviceBase.x + point.x) / 2} ${Math.min(point.serviceBase.y, point.y) - 90} ${point.x} ${point.y}`;

  return (
    <div className="arm-map-panel" data-testid="arm-map-panel">
      <div className="arm-map-head">
        <div>
          <b>Карта происшествия</b>
          <span>{address || 'Адрес не заполнен'}</span>
        </div>
        <Space>
          <Tag color="green">Локально</Tag>
          <Tag color="blue">Москва</Tag>
          {gis ? (
            <Tag color="geekblue">OSM · PMTiles</Tag>
          ) : (
            <Tag color="default">Учебная схема</Tag>
          )}
        </Space>
      </div>
      <Alert
        type="warning"
        showIcon
        message="Локальная карта Москвы"
        description={
          gis
            ? 'Загружен локальный OSM-пакет Москвы (PMTiles). Точка, база и линия маршрута рассчитываются по учебному правилу адресации для закрытого стенда.'
            : 'Отображается учебная схема Москвы. Точка, база и линия маршрута рассчитываются по учебному правилу адресации для закрытого стенда.'
        }
      />
      <div
        className="arm-map-local"
        data-testid="arm-offline-map"
        role={gis ? undefined : 'img'}
        aria-label={gis ? undefined : 'Локальная учебная карта Москвы'}
      >
        {gis ? (
          <MoscowGisMap address={address} point={point} onFallback={handleFallback} />
        ) : (
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
            <ellipse
              className="arm-map-ring arm-map-ring-inner"
              cx="485"
              cy="325"
              rx="92"
              ry="64"
            />
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
        )}
      </div>
      <div className="arm-map-card">
        <b>
          <EnvironmentOutlined /> Точка происшествия
        </b>
        <span>{address || 'Адрес будет подставлен из карточки'}</span>
        <small>
          Зона: {point.district}; базовая служба: {point.serviceBase.name}. Данные не
          покидают локальный контур.
        </small>
      </div>
      <div className="arm-map-actions">
        <Button disabled>маршрут служб</Button>
        <Button disabled>район выезда</Button>
        <Button disabled>локальный OSM-слой</Button>
      </div>
    </div>
  );
}
