export function formatDate(value?: string | null): string {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function fullName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "Sin nombre";
}

export function numberText(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "0";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("es", { maximumFractionDigits: 2 }).format(numeric);
}
