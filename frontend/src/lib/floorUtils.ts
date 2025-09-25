import type { DeskStatus, LegendKey } from "../components/FloorPlan";

const ISTANBUL_TZ = "Europe/Istanbul";

export const WORKSPACES = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
export const HEATMAP_LOOKBACK_DAYS = 7;

const FACILITY_META: Record<string, { icon: string; label: string }> = {
  "dual monitor": { icon: "🖥️", label: "Dual Monitor" },
  "double monitor": { icon: "🖥️", label: "Dual Monitor" },
  "monitor": { icon: "🖥️", label: "Monitor" },
  "thinkvision": { icon: "🖥️", label: "ThinkVision Display" },
  "thinkvision flat": { icon: "🖥️", label: "ThinkVision Display" },
  "double thinkvision": { icon: "🖥️", label: "Dual ThinkVision Displays" },
  "dual thinkvision": { icon: "🖥️", label: "Dual ThinkVision Displays" },
  "camera": { icon: "📷", label: "Camera" },
  "webcam": { icon: "📷", label: "Webcam" },
  "height adjustable": { icon: "🪑", label: "Height-Adjustable Desk" },
  "standing desk": { icon: "🪑", label: "Standing Desk" },
  "docking station": { icon: "🔌", label: "Docking Station" },
  "usb-c": { icon: "🔌", label: "USB-C Hub" },
  "dock": { icon: "🔌", label: "Dock" },
  "thinkpad ultra": { icon: "💻", label: "ThinkPad Ultra Dock" },
  "hp essential dock": { icon: "💼", label: "HP Essential Dock" },
  "keyboard": { icon: "⌨️", label: "Keyboard" },
  "mouse": { icon: "🖱️", label: "Mouse" },
  "wireless charger": { icon: "🔋", label: "Wireless Charger" },
  "charger": { icon: "🔋", label: "Charger" },
  "thunderbolt3 gen2": { icon: "⚡", label: "ThunderBolt3 Gen2" },
  "thunderbolt 3 gen2": { icon: "⚡", label: "ThunderBolt3 Gen2" },
  "thunderbolt3": { icon: "⚡", label: "ThunderBolt3" },
  "thunderbolt": { icon: "⚡", label: "ThunderBolt" },
  "speaker": { icon: "🔈", label: "Speakers" },
  "phone": { icon: "📞", label: "Desk Phone" },
  "lamp": { icon: "💡", label: "Lamp" },
  "whiteboard": { icon: "🧑‍🏫", label: "Whiteboard Nearby" },
};

function findFacilityMeta(source: string) {
  const key = source.trim().toLowerCase();
  if (!key) return undefined;

  const direct = FACILITY_META[key];
  if (direct) return direct;

  return Object.entries(FACILITY_META)
    .find(([candidate]) => key.includes(candidate))?.[1];
}

export function generateDeskLayout(): DeskStatus[] {
  const desks: DeskStatus[] = [];
  WORKSPACES.forEach((workspace) => {
    for (let i = 1; i <= 7; i++) {
      const code = `${workspace}${i}`;
      desks.push({
        id: code,
        label: `${workspace}-${i}`,
        workspace,
        seats: 1,
        status: "available",
      });
    }
  });
  return desks;
}

export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isoToHHMMInTR(iso: string): string {
  const dt = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ISTANBUL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dt);
}

export function isoDateKeyInTR(iso: string | null | undefined): string {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dt);
}

export function normalizeDeskCode(code?: string | null): string {
  if (!code) return "";

  const trimmed = code.trim();
  const firstToken = trimmed.split(/\s+/)[0] ?? trimmed;
  const match = firstToken.match(/^([A-Za-z]+)[^0-9A-Za-z]*?(\d+)$/);

  if (match) {
    const [, prefix, num] = match;
    const normalizedNumber = Number.parseInt(num, 10).toString();
    return `${prefix.toUpperCase()}${normalizedNumber}`;
  }

  return firstToken.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function workspaceFromDesk(code?: string): string {
  if (!code) return "";
  const normalized = normalizeDeskCode(code);
  const match = normalized.match(/^[A-Z]+/);
  return match?.[0] ?? "";
}

export function mapDeskStatus(status?: string): LegendKey {
  switch (status) {
    case "MyReservation":
      return "byMe";
    case "BookedByOthers":
      return "booked";
    case "Unavailable":
      return "unavailable";
    default:
      return "available";
  }
}

export function describeFacility(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return { icon: "🔧", label: raw };

  const normalized = trimmed.toLowerCase();
  const exactMeta = FACILITY_META[normalized];
  if (exactMeta) {
    return { icon: exactMeta.icon, label: exactMeta.label };
  }

  const normalizedSeparators = trimmed.replace(/[\u2013\u2014]/g, "-");
  const originalParts = normalizedSeparators
    .split(/\s*-\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (originalParts.length > 1) {
    const segmentMetas = originalParts.map((part) => {
      const meta = findFacilityMeta(part);
      return {
        icon: meta?.icon,
        label: meta?.label ?? part,
      };
    });

    const icon = segmentMetas.find((entry) => entry.icon)?.icon ?? "🔧";
    const label = segmentMetas.map((entry) => entry.label).join(" - ");

    return { icon, label };
  }

  const fallbackMeta = findFacilityMeta(trimmed);
  if (fallbackMeta) {
    return { icon: fallbackMeta.icon, label: fallbackMeta.label };
  }

  return { icon: "🔧", label: trimmed };
}
