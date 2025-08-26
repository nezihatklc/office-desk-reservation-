import React, { useEffect, useMemo, useRef, useState } from "react";
import FloorSvg from "../assets/floor-plan.svg?react";

export type LegendKey = "byMe" | "booked" | "available" | "unavailable";
export type DeskStatus = { id: string; label: string; seats: number; status: LegendKey };

const STATUS_COLORS: Record<LegendKey, string> = {
  byMe:        "var(--colors-secondary-main)",
  booked:      "var(--colors-status-alert)",
  available:   "var(--colors-status-success)",
  unavailable: "var(--colors-divider-dark)",
};

export default function FloorPlan({
  desks,
  onSelect,
  selectedId,
}: {
  desks: DeskStatus[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const statusById = useMemo(() => {
    const m = new Map<string, LegendKey>();
    desks.forEach((d) => m.set(d.id, d.status));
    return m;
  }, [desks]);

  /** -------- highlight helpers (do NOT hide base “Rounded rectangle”) -------- */

  // find an author-provided highlight layer if it exists
  function findHighlight(svg: SVGSVGElement, g: SVGGElement, id: string) {
    return (
      (svg.getElementById(`Highlight_${id}`) as SVGGraphicsElement | null) ||
      (svg.getElementById(`HL_${id}`) as SVGGraphicsElement | null) ||
      (g.querySelector<SVGGraphicsElement>('[id^="selected"],[id*="Selected"]') as SVGGraphicsElement | null)
      // intentionally no fallback to "Rounded rectangle" (that's the base desk)
    );
  }

  // otherwise create a soft underlay rect (HL_{id}) from group's bbox
  function ensureUnderlayRect(svg: SVGSVGElement, id: string) {
    const g = svg.getElementById(id) as SVGGElement | null;
    if (!g) return null;

    const existing = svg.getElementById(`HL_${id}`) as SVGRectElement | null;
    if (existing) return existing;

    let bbox: DOMRect | null = null;
    try { bbox = g.getBBox(); } catch { bbox = null; }
    if (!bbox) return null;

    const pad = 6;
    const hl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    hl.setAttribute("id", `HL_${id}`);
    hl.setAttribute("x", String(bbox.x - pad));
    hl.setAttribute("y", String(bbox.y - pad));
    hl.setAttribute("width", String(bbox.width + pad * 2));
    hl.setAttribute("height", String(bbox.height + pad * 2));
    hl.setAttribute("rx", "10");
    hl.setAttribute("ry", "10");
    hl.setAttribute("opacity", "0");
    hl.setAttribute("pointer-events", "none");
    // smooth transitions
    hl.style.transition = "opacity .12s ease, fill .12s ease, stroke .12s ease";
    // place under children
    g.insertBefore(hl, g.firstChild);
    return hl;
  }

  /** -------- bind hover/click to Hit_ID (or group) -------- */
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const disposers: Array<() => void> = [];

    statusById.forEach((_s, deskId) => {
      const hit = svg.getElementById(`Hit_${deskId}`) as SVGGraphicsElement | null;
      const g = svg.getElementById(deskId) as SVGGElement | null;
      const target = (hit ?? g) as SVGGraphicsElement | null;
      if (!target) return;

      const onEnter = () => setHovered(deskId);
      const onLeave = () => setHovered((h) => (h === deskId ? null : h));
      const onClick = () => onSelect(deskId);

      target.style.cursor = "pointer";
      target.addEventListener("mouseenter", onEnter);
      target.addEventListener("mouseleave", onLeave);
      target.addEventListener("click", onClick);

      disposers.push(() => {
        target.removeEventListener("mouseenter", onEnter);
        target.removeEventListener("mouseleave", onLeave);
        target.removeEventListener("click", onClick);
      });
    });

    return () => disposers.forEach((fn) => fn());
  }, [statusById, onSelect]);

  /** -------- elegant highlight (subtle glass look) -------- */
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;

    // reset only highlight layers (never touch base desk)
    statusById.forEach((_s, id) => {
      const g = svg.getElementById(id) as SVGGElement | null;
      if (!g) return;
      g.classList.remove("is-hovered", "is-selected");

      const hl = findHighlight(svg, g, id) || ensureUnderlayRect(svg, id);
      if (hl) (hl as any).style.opacity = "0";
    });

    const apply = (id: string | null, mode: "hover" | "selected") => {
      if (!id) return;
      const g = svg.getElementById(id) as SVGGElement | null;
      if (!g) return;

      const hl = findHighlight(svg, g, id) || ensureUnderlayRect(svg, id);
      if (!hl) return;

      (hl as any).style.opacity = "1";
      // subtle fills & borders
      if (mode === "selected") {
        hl.setAttribute("fill", "rgba(73,162,223,0.16)");     // secondary.main (49A2DF) -> 16%
        hl.setAttribute("stroke", "rgba(73,162,223,0.65)");   // secondary.main -> 65%
      } else {
        hl.setAttribute("fill", "rgba(255,255,255,0.10)");    // beyaz hover
        hl.setAttribute("stroke", "rgba(255,255,255,0.35)");
      }
    };

    apply(hovered, "hover");
    apply(selectedId ?? null, "selected");
  }, [hovered, selectedId, statusById]);

  /** -------- paint seats by status -------- */
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;

    statusById.forEach((status, id) => {
      const color = STATUS_COLORS[status];
      const g = svg.getElementById(id) as SVGGElement | null;
      if (!g) return;

      const seatRoot =
        (svg.getElementById(`seat_${id}`) as SVGElement | null) ||
        (g.querySelector<SVGElement>('[id^="seat"]') as SVGElement | null);

      if (!seatRoot) return;

      seatRoot
        .querySelectorAll<SVGElement>("circle, rect, path, ellipse, polygon, polyline")
        .forEach((el) => el.setAttribute("fill", color));
    });
  }, [statusById]);

  return (
    <div>
      <style>{`
        /* remove heavy glow; underlay rect already shows state cleanly */
        svg g.is-hovered  { filter: none; }
        svg g.is-selected { filter: none; }
      `}</style>
      <FloorSvg
        ref={svgRef as any}
        style={{
          width: "100%",
          height: "auto",
          minHeight: "420px",
          maxHeight: "min(70vh, 820px)"
        }}
      />
    </div>
  );
}
