import { useState } from 'react';
import { Button, Tooltip } from 'antd';
import {
  DownOutlined,
  EditOutlined,
  HistoryOutlined,
  UnorderedListOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { date, labels } from '../components';
import type { Incident } from '../types';

type Props = {
  card: Incident;
  own: boolean;
  locked: boolean;
  busy: boolean;
  onReact: () => void;
  onRoutes: () => void;
  onHistory: () => void;
};

export function ServiceDock({ card, own, locked, busy, onReact, onRoutes, onHistory }: Props) {
  const [expanded, setExpanded] = useState(true);
  const events = (card.events || []).filter((event) =>
    ['incoming', 'created', 'opened', 'reaction'].includes(event.kind),
  );
  const scenarioService = card.scenario?.service?.trim();
  const service = scenarioService?.toLowerCase().startsWith('ддс')
    ? scenarioService
    : 'ДДС учебного района';
  const routedService = scenarioService && scenarioService !== service ? scenarioService : null;
  const lastEvent = events.at(-1);
  const referenceServices = Array.from(
    new Set(
      [routedService, ...(card.classification?.routes || []).map((route) => route.service)].filter(
        (name): name is string => Boolean(name),
      ),
    ),
  )
    .filter((name) => name !== service && !name.toLowerCase().includes('нет реагирования'))
    .slice(0, 5);
  return (
    <section className="arm-service-dock" aria-label="Реагирование службы">
      {expanded ? (
        <div className="arm-service-history" data-testid="arm-service-history">
          <div className="arm-service-title">
            <b>{service}</b>
            <Tooltip title="Свернуть историю службы">
              <Button
                type="text"
                aria-label="Свернуть историю службы"
                icon={<DownOutlined />}
                onClick={() => setExpanded(false)}
              />
            </Tooltip>
          </div>
          <div className="arm-service-events">
            {events.map((event) => (
              <div className="arm-service-event" key={event.id}>
                <span>
                  {event.actor_name ? `оп. ${event.actor_name}` : 'оп. ДДС'} ·{' '}
                  {date(event.created_at)}
                </span>
                <b>
                  {event.kind === 'reaction'
                    ? labels[event.payload.status] || event.payload.status
                    : event.kind === 'opened'
                      ? 'Получена службой'
                      : 'Добавлена'}
                </b>
                <span>{event.payload.comment || ''}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className={'arm-service-bar ' + (own && !locked ? 'arm-service-bar-active' : '')}>
        <span className="arm-service-caption">Службы:</span>
        <div className="arm-service-tile">
          <Button
            type="text"
            aria-label="История реагирования службы"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            icon={expanded ? <DownOutlined /> : <UpOutlined />}
          >
            {service}
          </Button>
          <div>
            <span>
              {lastEvent
                ? new Date(lastEvent.created_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}{' '}
              {labels[card.status] || card.status}
            </span>
            {routedService ? <span>направление: {routedService}</span> : null}
            {own && !locked ? (
              <Button
                aria-label="Изменить статус"
                icon={<EditOutlined />}
                disabled={busy || card.allowed_statuses.length === 0}
                onClick={onReact}
              />
            ) : null}
          </div>
        </div>
        {referenceServices.map((name) => (
          <Tooltip title="Справочник возможных получателей по району обслуживания и подчинённости. Для ДДС бригады выбираются вручную и фиксируются в журнале занятия.">
            <div className="arm-service-tile arm-service-reference" key={name}>
              <button type="button" aria-label={'Справочная служба ' + name} onClick={onRoutes}>
                {name}
              </button>
              <span>ручной выбор · по принадлежности</span>
            </div>
          </Tooltip>
        ))}
        <div className="arm-service-tools">
          <Tooltip title="Справочник служб по району, подчинённости и условиям классификатора">
            <Button
              aria-label="Справочник маршрутов"
              icon={<UnorderedListOutlined />}
              onClick={onRoutes}
            />
          </Tooltip>
          <Tooltip title="История действий">
            <Button aria-label="История действий" icon={<HistoryOutlined />} onClick={onHistory} />
          </Tooltip>
        </div>
        {locked || !own ? (
          <span className="arm-lock-note">
            {card.session_status === 'finished'
              ? 'Занятие завершено'
              : own
                ? 'Редактирование закрыто'
                : 'Просмотр преподавателя'}
          </span>
        ) : null}
      </div>
    </section>
  );
}
