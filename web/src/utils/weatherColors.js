export function tempColor(celsius) {
  if (celsius == null || celsius === "" || !Number.isFinite(Number(celsius))) return "var(--storm)";
  if (celsius < 10) return "var(--t-cold)";
  if (celsius < 18) return "var(--t-cool)";
  if (celsius < 25) return "var(--t-mild)";
  if (celsius < 32) return "var(--t-warm)";
  if (celsius < 40) return "var(--t-hot)";
  return "var(--t-extreme)";
}

export function rainColor(mmPerHour) {
  if (mmPerHour == null || mmPerHour === "" || !Number.isFinite(Number(mmPerHour)) || Number(mmPerHour) <= 0) return "var(--stratus)";
  if (mmPerHour < 0.5) return "var(--r-light)";
  if (mmPerHour < 2.5) return "var(--r-moderate)";
  if (mmPerHour < 7.5) return "var(--r-heavy)";
  if (mmPerHour < 15) return "var(--r-intense)";
  return "var(--r-extreme)";
}

export function alertColor(level) {
  const normalized = String(level || "").toLowerCase();
  if (["green", "low", "normal", "info"].includes(normalized)) return "var(--alert-green)";
  if (["yellow", "medium", "caution"].includes(normalized)) return "var(--alert-yellow)";
  if (["orange", "high", "urgent"].includes(normalized)) return "var(--alert-orange)";
  return "var(--alert-red)";
}