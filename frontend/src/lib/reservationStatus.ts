export type ReservationStatusKey =
  | "confirmed"
  | "pending"
  | "checkedin"
  | "checkedout"
  | "cancelled";

export type ReservationStatusMeta = {
  key: ReservationStatusKey;
  label: string;
  emoji: string;
  accent: string;
};

const STATUS_META: Record<ReservationStatusKey, Omit<ReservationStatusMeta, "key">> = {
  confirmed: { label: "Confirmed", emoji: "⏳", accent: "#34d399" },
  pending: { label: "Pending", emoji: "⏳", accent: "#fbbf24" },
  checkedin: { label: "Checked-in", emoji: "✅", accent: "#69a7ff" },
  checkedout: { label: "Checked-out", emoji: "👋🏻", accent: "#7F5AF0" },
  cancelled: { label: "Cancelled", emoji: "❌", accent: "#f87171" },
};

function normalizeStatus(status?: string | null): ReservationStatusKey {
  const normalized = status?.trim().toLowerCase();
  switch (normalized) {
    case "checkedin":
      return "checkedin";
    case "checkedout":
      return "checkedout";
    case "cancelled":
      return "cancelled";
    case "pending":
      return "pending";
    case "confirmed":
    case undefined:
    case null:
      return "confirmed";
    default:
      return "confirmed";
  }
}

export function getReservationStatusMeta(status?: string | null): ReservationStatusMeta {
  const key = normalizeStatus(status);
  const meta = STATUS_META[key];
  return { key, ...meta };
}

export function formatReservationStatus(
  status?: string | null,
  options: { withEmoji?: boolean } = { withEmoji: true }
): string {
  const meta = getReservationStatusMeta(status);
  if (options.withEmoji === false) return meta.label;
  return `${meta.label} ${meta.emoji}`;
}
