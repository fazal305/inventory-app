// Remember Me only pre-fills the username; it never keeps anyone signed in.
const KEY = 'staff-assets:remembered-username';

export function getRememberedUsername() {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function setRememberedUsername(username) {
  try {
    if (username) localStorage.setItem(KEY, username);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the feature just degrades.
  }
}
