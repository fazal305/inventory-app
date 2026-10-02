const REQUEST_TIMEOUT_MS = 15000;

let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

/** Normalized error for every failed request, so UI code handles one shape. */
export class ApiError extends Error {
  constructor({ status = 0, code, message, fields = null, retryAfter = null }) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.retryAfter = retryAfter;
  }
}

const AUTH_LOST_CODES = new Set(['UNAUTHENTICATED', 'SESSION_EXPIRED']);

export async function request(method, path, body, { notifyAuthLost = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  let response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError({
        code: 'TIMEOUT',
        message: 'The server took too long to respond. Check your connection and try again.',
      });
    }
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw new ApiError({
      code: offline ? 'OFFLINE' : 'NETWORK',
      message: offline
        ? 'You appear to be offline. Reconnect and try again.'
        : 'Could not reach the server. Check your connection and try again.',
    });
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON bodies (proxy error pages, etc.) fall through to the generic error below.
  }

  if (response.ok && payload && 'data' in payload) return payload.data;

  const error = payload?.error;
  const apiError = new ApiError({
    status: response.status,
    code: error?.code ?? 'UNEXPECTED',
    message: error?.message ?? 'Something went wrong on our side. Please try again.',
    fields: error?.fields ?? null,
    retryAfter: Number(response.headers.get('Retry-After')) || null,
  });

  if (notifyAuthLost && response.status === 401 && AUTH_LOST_CODES.has(apiError.code)) {
    window.dispatchEvent(new CustomEvent('auth:lost', { detail: { code: apiError.code } }));
  }

  throw apiError;
}

export const api = {
  // The initial session probe expects a 401 when signed out, so it must not announce a lost session.
  session: () => request('GET', 'session.php', undefined, { notifyAuthLost: false }),
  login: (username, password) => request('POST', 'login.php', { username, password }),
  logout: () => request('POST', 'logout.php'),
  listAssets: () => request('GET', 'assets.php'),
  createAsset: (asset) => request('POST', 'assets.php', asset),
  moveAsset: (id, roomNumber) =>
    request('PUT', `assets.php?id=${encodeURIComponent(id)}`, { room_number: roomNumber }),
  deleteAsset: (id) => request('DELETE', `assets.php?id=${encodeURIComponent(id)}`),
};
