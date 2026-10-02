// Client for backend/ (fazal305/inventory-api, merged into this repo).
//
// This is a *separate* API from server/ (lib/api.js): server/ is this app's
// own small session-cookie-authenticated API for the simple room register;
// backend/ is a standalone PHP service with its own bearer-token auth and
// database, extended with the `assets` resource that the Assets page below
// uses for full asset management (tag, status, assignment, location,
// purchase/warranty info, and a status/assignment history log).
//
// Base URL: VITE_BACKEND_API_URL, defaulting to the dev proxy path below
// (see vite.config.js). In production, backend/ is typically its own
// deployment on its own origin — set VITE_BACKEND_API_URL at build time to
// point at it (e.g. https://api.example.com/api/v1).
const BASE_URL = import.meta.env.VITE_BACKEND_API_URL ?? '/backend-api/v1';

const REQUEST_TIMEOUT_MS = 15000;
const AUTH_STORAGE_KEY = 'backend_auth';

export class BackendApiError extends Error {
  constructor({ status = 0, code, message, details = null }) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Reads/writes the bearer token + expiry. Wrapped in try/catch: localStorage can throw or be unavailable. */
function readAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeAuth(auth) {
  try {
    if (auth) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Best-effort only — a session that can't persist still works until reload.
  }
}

export function getBackendSession() {
  const auth = readAuth();
  return auth ? { email: auth.email, expiresAt: auth.expiresAt } : null;
}

async function request(method, path, body, { auth = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const session = auth ? readAuth() : null;
  if (session) headers.Authorization = `Bearer ${session.token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new BackendApiError({ code: 'TIMEOUT', message: 'The backend took too long to respond.' });
    }
    throw new BackendApiError({ code: 'NETWORK', message: 'Could not reach the backend API. Is it running?' });
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON bodies fall through to the generic error below.
  }

  if (response.ok && payload?.success) return { data: payload.data, meta: payload.meta ?? null };

  if (response.status === 401) writeAuth(null);

  const error = payload?.error;
  throw new BackendApiError({
    status: response.status,
    code: error?.code ?? 'UNEXPECTED',
    message: error?.message ?? 'Something went wrong talking to the backend API.',
    details: error?.details ?? null,
  });
}

export const backendApi = {
  async login(email, password) {
    const { data } = await request('POST', '/auth/login', { email, password }, { auth: false });
    writeAuth({ token: data.token, expiresAt: data.expires_at, email });
    return data;
  },

  async logout() {
    try {
      await request('POST', '/auth/logout');
    } finally {
      writeAuth(null);
    }
  },

  isAuthenticated() {
    return readAuth() !== null;
  },

  async listCategories() {
    const { data } = await request('GET', '/categories', undefined, { auth: false });
    return data;
  },

  async listAssets(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null));
    const qs = params.toString();
    const { data, meta } = await request('GET', `/assets${qs ? `?${qs}` : ''}`, undefined, { auth: false });
    return { data, meta };
  },

  async getAssetHistory(id) {
    const { data } = await request('GET', `/assets/${encodeURIComponent(id)}/history`);
    return data;
  },

  async createAsset(asset) {
    const { data } = await request('POST', '/assets', asset);
    return data;
  },

  async updateAsset(id, fields) {
    const { data } = await request('PATCH', `/assets/${encodeURIComponent(id)}`, fields);
    return data;
  },

  async deleteAsset(id) {
    await request('DELETE', `/assets/${encodeURIComponent(id)}`);
  },
};
