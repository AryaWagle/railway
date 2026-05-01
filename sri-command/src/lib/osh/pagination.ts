/** Resolve OSH `next` link (absolute or relative) against the API base. */
export function resolveOshNextUrl(next: string | null | undefined, apiBase: string): string | null {
  if (next == null || next === "") return null;
  const base = apiBase.endsWith("/") ? apiBase : `${apiBase}/`;
  try {
    return new URL(next, base).href;
  } catch {
    return null;
  }
}
