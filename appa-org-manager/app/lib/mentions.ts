// Username mention helpers. Usernames are `firstname.lastname`, so a mention
// looks like `@firstname.lastname`. Shared by the messages API (to create
// notifications) and the chat UI (to highlight). No server-only imports here.

// Matches @ followed by a username-shaped token. Validation against real
// usernames happens by the caller.
export const MENTION_REGEX = /@([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)/g;

// Extract unique, lowercased usernames referenced by @mentions in a string.
export function extractMentions(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION_REGEX)) {
    found.add(match[1].toLowerCase());
  }
  return [...found];
}
