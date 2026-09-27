# Offline Map Plan

Версия: 2026-09-22. Статус: реализовано и проверено (dev + preview).

## Что сделано сейчас

В `frontend/src/arm/MapPanel.tsx` реализована полностью локальная карта Москвы на OSM/PMTiles:

- локальный пакет `frontend/public/maps/moscow.pmtiles` (~76 MB, bounds Москвы, maxzoom 14, сборка `scripts/windows/build-map-pack.ps1`);
- MapLibre GL + `pmtiles` protocol (`addProtocol('pmtiles', new Protocol().tile)`);
- glyph-шрифты в `frontend/public/maps/fonts/` (NotoSansRegular);
- HTTP Range middleware в `frontend/vite.config.ts` (`pmtilesRange`) для dev и preview;
- Vite-плагин `maplibreWorkerAsset` копирует в `dist/assets` **и** `maplibre-gl-worker.mjs`, **и** `maplibre-gl-shared.mjs` (worker импортирует shared; без него preview отдавал HTML и тайлы зависали в `loading`);
- fallback на SVG-схему при отсутствии пакета/ошибке (HEAD `/maps/moscow.pmtiles` + таймер 12s);
- атрибуция `© Участники OpenStreetMap (ODbL)` и текст Alert со ссылкой на этот документ;
- Playwright `frontend/tests/map-gis.spec.ts`: тег `OSM · PMTiles`, ODbL, 206 с `content-length > 17000` на dev и preview.

Внешние API/ключи не используются; адрес не уходит наружу.

## Почему не внешний API

Система должна запускаться локально и быть пригодной для закрытого контура. Внешние карты требуют сетевого доступа и обычно отправляют адрес/координаты наружу. Поэтому карта не запрашивает ключ и не делает geocoding/fetch к внешнему провайдеру.

## Как обновить пакет

1. Скачать extract OSM (Geofabrik/NE), выполнить `scripts/windows/build-map-pack.ps1`.
2. Положить результат в `frontend/public/maps/moscow.pmtiles`.
3. При добавлении новых вендор-файлов MapLibre в dist — расширить список в `maplibreWorkerAsset` (worker + shared обязательны).

## Рекомендуемые источники и движки

- OpenStreetMap: открытые данные под ODbL; при использовании нужна атрибуция.
- Geofabrik: готовые OSM `.osm.pbf` выгрузки, можно брать региональные/российские extract-файлы и резать до Москвы.
- PMTiles: один файл с тайлами, удобно хранить и отдавать локальным HTTP-сервером или из `public/`.
- MapLibre GL JS: WebGL renderer для vector tiles в браузере; подходит для будущей плавной карты внутри React.

## Ограничения

Пакет — учебный offline-слой для тренажёра, не кадастровая/навигационная карта и не полная ГИС. Формат/стиль слоёв описаны в `buildGisStyle` (`MapPanel.tsx`).

