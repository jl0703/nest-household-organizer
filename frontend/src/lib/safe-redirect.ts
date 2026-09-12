/**
 * Restricts a user-supplied `redirectTo` value to a same-origin relative
 * path, preventing open-redirect payloads such as `.attacker.com/phish`
 * (which, concatenated with an origin like `https://app.example.com`,
 * produces the attacker-controlled host `app.example.comattacker.com`)
 * or protocol-relative payloads such as `//attacker.com`.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/households/new"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
