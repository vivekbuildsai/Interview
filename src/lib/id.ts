export function newId(prefix = ""): string {
  const raw = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return prefix ? `${prefix}_${raw}` : raw
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}
