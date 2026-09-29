export type User = {
  id: string;
  email: string;
  name: string;
  role: 'trainee' | 'instructor' | 'administrator';
};
export type IncidentType = { id: number; external_code: string; name: string };
export type Source = {
  type?: string;
  file?: string;
  page?: number;
  note?: string;
  status?: string;
  model?: string;
  reviewer?: string;
  reviewed_at?: string;
};
export type Scenario = {
  id: string;
  title: string;
  difficulty: string;
  prompt: string;
  service: string;
  briefing: string[];
  source: Source;
  expected_hint?: string | null;
};
export type GeneratedScenario = {
  schema_version: string;
  id: string;
  title: string;
  difficulty: string;
  difficulty_score?: number;
  difficulty_factors?: string[];
  service: string;
  prompt: string;
  briefing: string[];
  card: CardFields;
  reference: {
    version: string;
    address: string;
    incident_type_id: number;
    expected_actions: string[];
    key_information?: unknown[];
    routing_rules?: unknown[];
  };
  source: Source;
  ml_metadata?: Record<string, unknown>;
};
export type GenerateResponse = {
  schema_version: string;
  mode: string;
  model: string;
  items: GeneratedScenario[];
};
export type ImportResponse = { imported: number; ids: string[] };
export type Evaluation = {
  schema_version: string;
  session_id: string;
  mode: string;
  model_version: string;
  reference_version: string;
  score: number | null;
  critical_errors: string[];
  field_errors: { field: string; expected: unknown; actual: unknown }[];
  missing_information: string[];
  timing: {
    elapsed_seconds: number;
    acknowledgement_seconds: number | null;
    first_response_seconds?: number | null;
    first_response_deadline_seconds?: number;
  };
  routing_assessment?: Record<string, unknown>;
  comment_quality?: {
    status?: string;
    model?: string;
    explanation?: string;
    strengths?: string[];
    improvements?: string[];
  };
  explanation: string;
};
export type Event = {
  id: string;
  kind: string;
  payload: Record<string, string>;
  created_at: string;
  actor_id: string;
  actor_name?: string | null;
};
export type Feedback = {
  id: string;
  comment: string;
  verdict: string;
  created_at: string;
  author_name?: string | null;
};
export type Incident = {
  id: string;
  number: string;
  owner_id: string;
  session_id: string | null;
  caller_number: string;
  name: string;
  address: string;
  incident_type_id: number;
  incident_type: string;
  comments: string;
  status: string;
  status_label: string;
  version: number;
  created_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  acknowledgement_seconds: number;
  overdue: boolean;
  allowed_statuses: string[];
  session_status: string | null;
  finished_at: string | null;
  events?: Event[];
  evaluation?: Evaluation | null;
  scenario?: Scenario | null;
  feedback?: Feedback[];
  classification?: {
    features: string[];
    routes: {
      column: number;
      service: string;
      variant: string;
      condition: string;
      value: string;
    }[];
    source: { file: string; row: number };
  };
};
export type Session = {
  id: string;
  trainee: string;
  user_id: string;
  scenario: string;
  status: string;
  started_at: string;
  incident_id: string;
  evaluation: Evaluation | null;
  feedback: Feedback[];
};
export type CardFields = Pick<
  Incident,
  'caller_number' | 'name' | 'address' | 'incident_type_id' | 'comments'
>;
