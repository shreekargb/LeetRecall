export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 100) return null
  const normalized = value.trim().toLowerCase()
  return /^[a-z][a-z0-9_]{2,23}$/.test(normalized) ? normalized : null
}
