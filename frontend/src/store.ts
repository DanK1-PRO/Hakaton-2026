import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  User,
  Incident,
  IncidentType,
  Scenario,
  Session,
  Evaluation,
  CardFields,
} from './types';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('dds_token') || sessionStorage.getItem('dds_token'),
    user: null as User | null,
  },
  reducers: {
    signedIn(state, action: PayloadAction<{ token: string; user: User; remember: boolean }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.removeItem('dds_token');
      sessionStorage.removeItem('dds_token');
      (action.payload.remember ? localStorage : sessionStorage).setItem(
        'dds_token',
        action.payload.token,
      );
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    signedOut(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('dds_token');
      sessionStorage.removeItem('dds_token');
    },
  },
});
export const { signedIn, signedOut, setUser } = authSlice.actions;
const base = fetchBaseQuery({
  baseUrl: '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: { token: string | null } }).auth.token;
    if (token) headers.set('Authorization', 'Bearer ' + token);
    return headers;
  },
});
export const api = createApi({
  reducerPath: 'api',
  baseQuery: async (args, ctx, opts) => {
    const result = await base(args, ctx, opts);
    if (result.error?.status === 401 && !(typeof args === 'object' && args.url === '/auth/login'))
      ctx.dispatch(signedOut());
    return result;
  },
  tagTypes: ['Incidents', 'Sessions', 'Users'],
  endpoints: (b) => ({
    login: b.mutation<{ access_token: string; user: User }, { username: string; password: string }>(
      {
        query: (data) => ({ url: '/auth/login', method: 'POST', body: new URLSearchParams(data) }),
      },
    ),
    me: b.query<User, void>({ query: () => '/auth/me' }),
    types: b.query<IncidentType[], void>({ query: () => '/incident-types?limit=2000' }),
    incidents: b.query<{ items: Incident[]; total: number }, Record<string, string | number>>({
      query: (params) => ({ url: '/incidents', params }),
      providesTags: ['Incidents'],
    }),
    incident: b.query<Incident, string>({
      query: (id) => '/incidents/' + id,
      providesTags: ['Incidents'],
    }),
    create: b.mutation<Incident, CardFields>({
      query: (body) => ({ url: '/incidents', method: 'POST', body }),
      invalidatesTags: ['Incidents'],
    }),
    edit: b.mutation<Incident, CardFields & { id: string; version: number }>({
      query: ({ id, ...body }) => ({ url: '/incidents/' + id, method: 'PATCH', body }),
      invalidatesTags: ['Incidents'],
    }),
    remove: b.mutation<void, string>({
      query: (id) => ({ url: '/incidents/' + id, method: 'DELETE' }),
      invalidatesTags: ['Incidents'],
    }),
    open: b.mutation<Incident, string>({
      query: (id) => ({ url: '/incidents/' + id + '/open', method: 'POST' }),
      invalidatesTags: ['Incidents'],
    }),
    react: b.mutation<Incident, { id: string; version: number; status: string; comment: string }>({
      query: ({ id, ...body }) => ({ url: '/incidents/' + id + '/reaction', method: 'POST', body }),
      invalidatesTags: ['Incidents', 'Sessions'],
    }),
    communicate: b.mutation<Incident, { id: string; action: string }>({
      query: ({ id, ...body }) => ({
        url: '/incidents/' + id + '/communication',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Incidents'],
    }),
    scenarios: b.query<Scenario[], void>({ query: () => '/scenarios' }),
    start: b.mutation<Incident, string>({
      query: (scenario_id) => ({
        url: '/simulation/sessions',
        method: 'POST',
        body: { scenario_id },
      }),
      invalidatesTags: ['Incidents', 'Sessions'],
    }),
    finish: b.mutation<Evaluation, string>({
      query: (id) => ({ url: '/simulation/sessions/' + id + '/finish', method: 'POST' }),
      invalidatesTags: ['Incidents', 'Sessions'],
    }),
    sessions: b.query<Session[], void>({
      query: () => '/simulation/sessions',
      providesTags: ['Sessions'],
    }),
    feedback: b.mutation<Session, { id: string; comment: string; verdict: string }>({
      query: ({ id, ...body }) => ({
        url: '/instructor/sessions/' + id + '/feedback',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Sessions', 'Incidents'],
    }),
    ml: b.query<{ mode: string; available: boolean; asr: boolean }, void>({
      query: () => '/ml/status',
    }),
    users: b.query<User[], void>({ query: () => '/admin/users', providesTags: ['Users'] }),
    addUser: b.mutation<User, { email: string; name: string; password: string; role: string }>({
      query: (body) => ({ url: '/admin/users', method: 'POST', body }),
      invalidatesTags: ['Users'],
    }),
  }),
});
export const store = configureStore({
  reducer: { auth: authSlice.reducer, [api.reducerPath]: api.reducer },
  middleware: (get) => get().concat(api.middleware),
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
