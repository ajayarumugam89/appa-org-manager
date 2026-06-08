// Shared constants for the Appa Org Manager.

// Default password handed to every user on creation / admin-forced reset.
// Users are required to change it on first login (isFirstLogin flag).
export const DEFAULT_PASSWORD = 'AppaOrg2026!';

// Session cookie name for the jose-signed JWT.
export const SESSION_COOKIE = 'appa_session';

// How long a session stays valid.
export const SESSION_MAX_AGE_DAYS = 7;

// Chat messages older than this are hidden and purged.
export const CHAT_RETENTION_HOURS = 48;

export function chatCutoff(): Date {
  return new Date(Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000);
}
