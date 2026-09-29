import { useState } from 'react';
import { Alert, App, Button, Checkbox, InputNumber, Modal, Select, Space, Tag, Typography } from 'antd';
import { ExperimentOutlined, ImportOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { api } from './store';
import { errorText } from './components';
import type { GeneratedScenario } from './types';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Базовый',
  medium: 'Средний',
  hard: 'Сложный',
};

export function ScenarioLab() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState<number | undefined>();
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [preview, setPreview] = useState<GeneratedScenario[] | null>(null);
  const [model, setModel] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const { data: types = [] } = api.useTypesQuery();
  const { data: ml } = api.useMlQuery(undefined, { pollingInterval: 30000 });
  const [generate, { isLoading: generating }] = api.useGenerateScenariosMutation();
  const [importScenarios, { isLoading: importing }] = api.useImportScenariosMutation();
  const canGenerate = ml?.generator === true || (ml?.capabilities ?? []).includes('scenario_generator');
  const chosen = (preview ?? []).filter((item) => selected.includes(item.id));
  const reset = () => {
    setPreview(null);
    setSelected([]);
    setModel('');
  };
  const runGenerate = async () => {
    if (!typeId) {
      message.warning('Выберите тип происшествия');
      return;
    }
    try {
      const result = await generate({ incident_type_id: typeId, count, difficulty }).unwrap();
      setPreview(result.items);
      setModel(result.model);
      setSelected(result.items.map((item) => item.id));
    } catch (e) {
      message.error(errorText(e));
    }
  };
  const runImport = async () => {
    try {
      const result = await importScenarios({ items: chosen }).unwrap();
      message.success(`Импортировано сценариев: ${result.imported}`);
      reset();
      setOpen(false);
    } catch (e) {
      message.error(errorText(e));
    }
  };
  return (
    <span>
      <Button
        icon={<ThunderboltOutlined />}
        data-testid="scenario-lab-open"
        onClick={() => setOpen(true)}
      >
        Генерация сценариев
      </Button>
      <Modal
        title="Генерация учебных сценариев"
        open={open}
        onCancel={() => {
          setOpen(false);
          reset();
        }}
        footer={null}
        width={820}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            type="info"
            showIcon
            message="Полный цикл в интерфейсе преподавателя"
            description="Модель предлагает варианты заданий, вы проверяете их и импортируете только одобренные. Импортированные сценарии получают отметку о проверке и имя преподавателя."
          />
          {canGenerate ? null : (
            <Alert
              type="warning"
              showIcon
              message="Генерация сейчас недоступна"
              description="Нужен локальный ML-контур: ML_MODE=local и запущенный start-ml.ps1 с моделью."
            />
          )}
          <Space wrap>
            <Select
              aria-label="Тип происшествия"
              data-testid="scenario-lab-type"
              showSearch
              optionFilterProp="label"
              placeholder="Тип происшествия"
              value={typeId}
              onChange={setTypeId}
              options={types.map((t) => ({ value: t.id, label: t.name + ' · ' + t.external_code }))}
              style={{ width: 320 }}
            />
            <Select
              aria-label="Сложность"
              data-testid="scenario-lab-difficulty"
              placeholder="Сложность: авто"
              allowClear
              value={difficulty ?? undefined}
              onChange={(v) => setDifficulty(v ?? null)}
              options={[
                { value: 'easy', label: 'Базовый' },
                { value: 'medium', label: 'Средний' },
                { value: 'hard', label: 'Сложный' },
              ]}
              style={{ width: 170 }}
            />
            <InputNumber
              aria-label="Количество вариантов"
              min={1}
              max={3}
              value={count}
              onChange={(v) => setCount(v ?? 1)}
            />
            <Button
              type="primary"
              icon={<ExperimentOutlined />}
              data-testid="scenario-lab-generate"
              loading={generating}
              disabled={!canGenerate || !typeId}
              onClick={runGenerate}
            >
              Сгенерировать
            </Button>
          </Space>
          <div className="muted">
            Генерация идёт локальной моделью и может занять до 2 минут на вариант.
          </div>
          {preview ? (
            <div data-testid="scenario-lab-preview">
              <div className="section-heading">
                <h3>Предпросмотр: {preview.length} вариант(ов)</h3>
                {model ? <Tag color="blue">{model}</Tag> : null}
              </div>
              {preview.map((item) => (
                <article
                  key={item.id}
                  className="scenario"
                  data-testid="scenario-preview-item"
                  style={{ marginBottom: 12 }}
                >
                  <div className="scenario-top">
                    <Checkbox
                      checked={selected.includes(item.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, item.id]
                            : prev.filter((id) => id !== item.id),
                        )
                      }
                    >
                      Импортировать
                    </Checkbox>
                    <Tag color={item.difficulty === 'hard' ? 'red' : 'gold'}>
                      {DIFFICULTY_LABELS[item.difficulty] || item.difficulty}
                      {typeof item.difficulty_score === 'number'
                        ? ` · ${item.difficulty_score}/10`
                        : ''}
                    </Tag>
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.prompt}</p>
                  <div className="scenario-meta">Служба: {item.service}</div>
                  <div className="scenario-meta">Адрес: {item.card.address}</div>
                  <div className="scenario-meta">
                    Ожидаемые действия: {item.reference.expected_actions.join(', ')}
                  </div>
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    {item.source.model ? `Модель: ${item.source.model}. ` : ''}
                    {item.source.note}
                  </Typography.Paragraph>
                </article>
              ))}
              <Space>
                <Button
                  type="primary"
                  icon={<ImportOutlined />}
                  data-testid="scenario-lab-import"
                  loading={importing}
                  disabled={chosen.length === 0}
                  onClick={runImport}
                >
                  Импортировать выбранные ({chosen.length})
                </Button>
                <Button onClick={reset}>Очистить предпросмотр</Button>
              </Space>
            </div>
          ) : null}
        </Space>
      </Modal>
    </span>
  );
}
