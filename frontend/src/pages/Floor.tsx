import React from "react";

export type LegendKey = "byMe" | "booked" | "available" | "unavailable";

export interface DeskStatus {
  id: string;     // deskCode, e.g., "A1"
  label: string;  // same as id (shown)
  seats: number;  // cosmetic
  status: LegendKey;
}

const STATUS_COLORS: Record<LegendKey, string> = {
  byMe: "#69a7ff",
  booked: "#f87171",
  available: "#34d399",
  unavailable: "#9ca3af",
};

interface Props {
  desks: DeskStatus[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function Floor({ desks, selectedId, onSelect }: Props) {
  return (
    <div
      style={{
        position: "relative",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        background: "#f8fafc",
        padding: 20,
        display: "grid",
        gridTemplateColumns: "repeat(9, 1fr)",
        gap: 8,
      }}
    >
      {desks.map((d) => {
        const isSelected = selectedId === d.id;
        return (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            style={{
              border: isSelected ? "2px solid #2563eb" : "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 8,
              padding: 10,
              cursor: "pointer",
            }}
            title={d.label}
          >
            <div style={{ fontWeight: 600 }}>{d.label}</div>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: STATUS_COLORS[d.status],
                marginTop: 6,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
