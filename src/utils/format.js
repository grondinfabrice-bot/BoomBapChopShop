export function money(value) {
  return `${Number(value).toFixed(2)}€`;
}

export function time(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function uid(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
