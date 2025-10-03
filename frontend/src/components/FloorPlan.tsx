import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import FloorSvg from "../assets/floor-plan.svg?react";

function clampValue(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export type LegendKey = "byMe" | "booked" | "available" | "unavailable";
export type DeskStatus = {
  id: string; // unique SVG ID (A1, A2, … I7)
  label: string; // desk code, e.g. "A-01"
  workspace: string; // workspace zone, e.g. "A"
  seats: number;
  status: LegendKey;
};

const STATUS_COLORS: Record<LegendKey, string> = {
  byMe: "var(--colors-secondary-main)",
  booked: "var(--colors-status-alert)",
  available: "var(--colors-status-success)",
  unavailable: "var(--colors-divider-dark)",
};

function heatColor(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  const hue = 130 - clamped * 100; // green → amber
  const lightness = 70 - clamped * 20;
  return `hsla(${hue}, 65%, ${lightness}%, 0.85)`;
}

type FloorPlanProps = {
  desks: DeskStatus[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  onClearSelection?: () => void;
  showHeatmap?: boolean;
  workspaceHeat?: Record<string, number>;
};

export default function FloorPlan({
  desks,
  onSelect,
  selectedId,
  onClearSelection,
  showHeatmap = false,
  workspaceHeat,
}: FloorPlanProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panLimit, setPanLimit] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const MIN_ZOOM = 0.75;
  const MAX_ZOOM = 1.6;
  const ZOOM_STEP = 0.15;
  const ZOOM_RANGE = MAX_ZOOM - MIN_ZOOM;

  const clampZoom = useCallback(
    (value: number) => clampValue(value, MIN_ZOOM, MAX_ZOOM),
    [MIN_ZOOM, MAX_ZOOM]
  );

  const handleZoom = useCallback(
    (direction: "in" | "out" | "reset") => {
      if (direction === "reset") {
        setPan({ x: 0, y: 0 });
        setZoom(1);
        return;
      }

      setZoom((current) => {
        const next = direction === "in" ? current + ZOOM_STEP : current - ZOOM_STEP;
        return Number(clampZoom(next).toFixed(2));
      });
    },
    [ZOOM_STEP, clampZoom]
  );

  const canZoomOut = zoom > MIN_ZOOM + 0.01;
  const canZoomIn = zoom < MAX_ZOOM - 0.01;
  const sliderValue = useMemo(() => {
    const normalised = (zoom - MIN_ZOOM) / ZOOM_RANGE;
    return Math.round(normalised * 100);
  }, [zoom, MIN_ZOOM, ZOOM_RANGE]);

  const handleSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      if (Number.isNaN(raw)) return;
      const ratio = raw / 100;
      const next = MIN_ZOOM + ratio * ZOOM_RANGE;
      const clampedZoom = Number(clampZoom(next).toFixed(2));
      setZoom(clampedZoom);
      if (Math.abs(clampedZoom - 1) < 0.01) {
        setPan({ x: 0, y: 0 });
      }
    },
    [MIN_ZOOM, ZOOM_RANGE, clampZoom]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const target = event.target as Element | null;
      if (target && target.closest("[data-floor-controls]")) return;

      const deskHit = target?.closest('[id^="Hit_"]');
      const canPan = panLimit.x > 0.5 || panLimit.y > 0.5 || zoom > 1.01;

      if (!canPan) {
        if (!deskHit) {
          onClearSelection?.();
        }
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const startPan = { ...pan };
      let moved = false;
      const pressedOnDesk = Boolean(deskHit);

      const handleMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        if (!moved && (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1)) {
          moved = true;
        }

        const nextX = clampValue(startPan.x + deltaX, -panLimit.x, panLimit.x);
        const nextY = clampValue(startPan.y + deltaY, -panLimit.y, panLimit.y);

        setPan((prev) => (prev.x === nextX && prev.y === nextY ? prev : { x: nextX, y: nextY }));
        moveEvent.preventDefault();
      };

      const handleUp = (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        setIsDragging(false);

        if (moved || !wrapperRef.current) return;

        const upTarget = upEvent.target as Element | null;
        if (!wrapperRef.current.contains(upTarget as Node)) return;

        const releasedOnDesk =
          pressedOnDesk || Boolean(upTarget?.closest('[id^="Hit_"]'));

        if (!releasedOnDesk) {
          onClearSelection?.();
        }
      };

      setIsDragging(true);
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp, { once: true });
    },
    [pan, panLimit, zoom, onClearSelection]
  );

  const recomputePanBounds = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;
    const extraWidth = Math.max(0, width * (zoom - 1));
    const extraHeight = Math.max(0, height * (zoom - 1));

    const nextLimit = {
      x: extraWidth > 0 ? extraWidth / 2 : 0,
      y: extraHeight > 0 ? extraHeight / 2 : 0,
    };

    setPanLimit(nextLimit);
    setPan((prev) => ({
      x: nextLimit.x <= 0.5 ? 0 : clampValue(prev.x, -nextLimit.x, nextLimit.x),
      y: nextLimit.y <= 0.5 ? 0 : clampValue(prev.y, -nextLimit.y, nextLimit.y),
    }));
  }, [zoom]);

  useEffect(() => {
    recomputePanBounds();
  }, [recomputePanBounds]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      recomputePanBounds();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [recomputePanBounds]);

  const workspaceKeys = useMemo(() => {
    return Array.from(new Set(desks.map((desk) => desk.workspace)));
  }, [desks]);

  /** -------- Build status map -------- */
  const statusById = useMemo(() => {
    const map = new Map<string, LegendKey>();
    desks.forEach((d) => map.set(d.id, d.status));
    return map;
  }, [desks]);

  /** -------- Helpers -------- */
  function getOrCreateHighlight(svg: SVGSVGElement, g: SVGGElement, id: string): SVGGraphicsElement | null {
    return (
      (svg.getElementById(`Highlight_${id}`) as SVGGraphicsElement | null) ||
      (svg.getElementById(`HL_${id}`) as SVGGraphicsElement | null) ||
      createUnderlayRect(svg, g, id)
    );
  }

  function createUnderlayRect(svg: SVGSVGElement, g: SVGGElement, id: string) {
    const existing = svg.getElementById(`HL_${id}`) as SVGRectElement | null;
    if (existing) return existing;

    let bbox: DOMRect;
    try {
      bbox = g.getBBox();
    } catch {
      return null;
    }

    const pad = 6;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.id = `HL_${id}`;
    rect.setAttribute("x", String(bbox.x - pad));
    rect.setAttribute("y", String(bbox.y - pad));
    rect.setAttribute("width", String(bbox.width + pad * 2));
    rect.setAttribute("height", String(bbox.height + pad * 2));
    rect.setAttribute("rx", "10");
    rect.setAttribute("ry", "10");
    rect.setAttribute("opacity", "0");
    rect.setAttribute("pointer-events", "none");
    rect.style.transition = "opacity .15s ease, fill .15s ease, stroke .15s ease";
    g.appendChild(rect);
    return rect;
  }

  /** -------- Hover & click binding -------- */
  useEffect(() => {
    if (!wrapperRef.current) return;
    const svg = wrapperRef.current.querySelector("svg");
    if (!svg) return;

    const disposers: Array<() => void> = [];

    statusById.forEach((status, deskId) => {
      // 🎯 Target the clickable hit path (Hit_A1, Hit_A2, …)
      const hit = svg.getElementById(`Hit_${deskId}`) as SVGElement | null;
      if (!hit) {
        console.warn(`❌ Click area (Hit_${deskId}) not found in SVG`);
        return;
      }

      const isDisabled = status === "booked" || status === "unavailable";

      hit.style.pointerEvents = "all";
      hit.style.cursor = isDisabled ? "not-allowed" : "pointer";

      const onEnter = () => !isDisabled && setHovered(deskId);
      const onLeave = () => setHovered((h) => (h === deskId ? null : h));
      const onClick = (event: MouseEvent) => {
        if (!isDisabled) {
          event.stopPropagation();
          onSelect(deskId);

          // 🔹 Click animation on parent <g>
          const g = svg.getElementById(deskId) as SVGGElement | null;
          if (g) {
            g.style.transition = "transform 0.15s ease";
            g.style.transform = "scale(1.05)";
            setTimeout(() => {
              g.style.transform = "scale(1)";
            }, 150);
          }
        }
      };

      hit.addEventListener("mouseenter", onEnter);
      hit.addEventListener("mouseleave", onLeave);
      hit.addEventListener("click", onClick);

      disposers.push(() => {
        hit.removeEventListener("mouseenter", onEnter);
        hit.removeEventListener("mouseleave", onLeave);
        hit.removeEventListener("click", onClick);
      });
    });

    return () => disposers.forEach((fn) => fn());
  }, [statusById, onSelect]);

  /** -------- Highlight (hover + selected) -------- */
  useEffect(() => {
    if (!wrapperRef.current) return;
    const svg = wrapperRef.current.querySelector("svg");
    if (!svg) return;

    statusById.forEach((_s, id) => {
      const g = svg.getElementById(id) as SVGGElement | null;
      if (!g) return;
      const hl = getOrCreateHighlight(svg, g, id);
      if (hl) hl.style.opacity = "0";
    });

    function apply(id: string | null, mode: "hover" | "selected") {
      if (!id || !svg) return;
      const g = svg.getElementById(id) as SVGGElement | null;
      if (!g) return;

      const hl = getOrCreateHighlight(svg, g, id);
      if (!hl) return;

      hl.style.opacity = "1";
      if (mode === "selected") {
        hl.setAttribute("fill", "var(--floorplan-highlight-selected-fill)");
        hl.setAttribute("stroke", "var(--floorplan-highlight-selected-stroke)");
      } else {
        hl.setAttribute("fill", "var(--floorplan-highlight-hover-fill)");
        hl.setAttribute("stroke", "var(--floorplan-highlight-hover-stroke)");
      }
    }

    apply(hovered, "hover");
    apply(selectedId ?? null, "selected");
  }, [hovered, selectedId, statusById]);

  /** -------- Seat coloring by status -------- */
  useEffect(() => {
    if (!wrapperRef.current) return;
    const svg = wrapperRef.current.querySelector("svg");
    if (!svg) return;

    statusById.forEach((status, id) => {
      const color = STATUS_COLORS[status];
      const g = svg.getElementById(id) as SVGGElement | null;
      if (!g) return;

      const seats = g.querySelectorAll<SVGElement>(
        "circle, rect, path, ellipse, polygon, polyline"
      );
      seats.forEach((el) => el.setAttribute("fill", color));
    });
  }, [statusById]);

  /** -------- Workspace heatmap overlay -------- */
  useEffect(() => {
    if (!wrapperRef.current) return;
    const svg = wrapperRef.current.querySelector("svg");
    if (!svg) return;

    workspaceKeys.forEach((workspace) => {
      const group = svg.getElementById(`deskGroup_${workspace}`) as SVGGElement | null;
      if (!group) return;

      const overlayId = `Heat_${workspace}`;
      let overlay = svg.getElementById(overlayId) as SVGRectElement | null;

      if (!overlay) {
        let bbox: DOMRect;
        try {
          bbox = group.getBBox();
        } catch {
          return;
        }

        overlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        overlay.id = overlayId;
        const padding = 16;
        overlay.setAttribute("x", String(bbox.x - padding));
        overlay.setAttribute("y", String(bbox.y - padding));
        overlay.setAttribute("width", String(bbox.width + padding * 2));
        overlay.setAttribute("height", String(bbox.height + padding * 2));
        overlay.setAttribute("rx", "24");
        overlay.setAttribute("ry", "24");
        overlay.setAttribute("pointer-events", "none");
        overlay.style.transition = "opacity .3s ease";
        overlay.style.mixBlendMode = "multiply";
        group.insertBefore(overlay, group.firstChild);
      }

      const value = workspaceHeat?.[workspace] ?? 0;
      overlay.setAttribute("fill", heatColor(value));
      overlay.setAttribute("opacity", showHeatmap ? "1" : "0");
    });
  }, [workspaceKeys, workspaceHeat, showHeatmap]);

  /** -------- Debug: Log coordinates of all desks -------- */
  useEffect(() => {
    if (!wrapperRef.current) return;
    const svg = wrapperRef.current.querySelector("svg");
    if (!svg) return;

    desks.forEach((desk) => {
      const g = svg.getElementById(desk.id) as SVGGElement | null;
      if (!g) {
        console.warn(`⚠️ Desk ${desk.id} not found in SVG`);
        return;
      }
      const bbox = g.getBBox();
      console.log(
        `✅ Desk ${desk.id} (${desk.label}) → X:${bbox.x}, Y:${bbox.y}, W:${bbox.width}, H:${bbox.height}`
      );
    });
  }, [desks]);

  /** -------- Tooltip for workspace + desk -------- */
  const selectedDesk = desks.find((d) => d.id === selectedId);
  const hoveredDesk = desks.find((d) => d.id === hovered);

  const panEnabled = panLimit.x > 0.5 || panLimit.y > 0.5 || zoom > 1.01;

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        maxHeight: "920px",
        minHeight: "600px",
        margin: "0 auto",
        borderRadius: "18px",
        overflow: "hidden",
        background: "var(--floorplan-surface-card)",
        boxShadow: "var(--floorplan-shadow-card)",
        cursor: panEnabled ? (isDragging ? "grabbing" : "grab") : "default",
        userSelect: isDragging ? "none" : "auto",
        touchAction: panEnabled ? "none" : "auto",
      }}
      onPointerDown={handlePointerDown}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: "center center",
          transition: "transform 0.2s ease",
        }}
      >
        <FloorSvg
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        />
      </div>

      <div
        data-floor-controls
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          padding: "10px 14px",
          background: "var(--floorplan-surface-control)",
          borderRadius: 14,
          boxShadow: "var(--floorplan-shadow-control)",
          color: "var(--floorplan-text-on-dark)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              opacity: 0.85,
            }}
          >
            Zoom
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={sliderValue}
            onChange={handleSliderChange}
            aria-label="Adjust floor plan zoom"
            style={{
              accentColor: "var(--floorplan-slider-accent)",
              width: 140,
              cursor: "pointer",
            }}
          />
          <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{zoom.toFixed(2)}x</span>
        </label>

        <button
          type="button"
          onClick={() => handleZoom("out")}
          disabled={!canZoomOut}
          aria-label="Zoom out"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "none",
            background: "var(--floorplan-surface-button)",
            color: "var(--floorplan-text-on-dark)",
            fontSize: "1rem",
            cursor: canZoomOut ? "pointer" : "not-allowed",
            boxShadow: "var(--floorplan-shadow-button)",
          }}
        >
          -
        </button>
        <button
          type="button"
          onClick={() => handleZoom("in")}
          disabled={!canZoomIn}
          aria-label="Zoom in"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "none",
            background: "var(--floorplan-surface-button)",
            color: "var(--floorplan-text-on-dark)",
            fontSize: "1.05rem",
            cursor: canZoomIn ? "pointer" : "not-allowed",
            boxShadow: "var(--floorplan-shadow-button)",
          }}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => handleZoom("reset")}
          disabled={Math.abs(zoom - 1) < 0.01}
          aria-label="Reset zoom"
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: "none",
            background: "var(--floorplan-surface-button-strong)",
            color: "var(--floorplan-text-on-dark)",
            fontSize: "0.74rem",
            cursor: Math.abs(zoom - 1) < 0.01 ? "not-allowed" : "pointer",
            boxShadow: "var(--floorplan-shadow-button-strong)",
          }}
        >
          Reset
        </button>
      </div>

      {(hoveredDesk || selectedDesk) && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "var(--floorplan-surface-tooltip)",
            color: "var(--floorplan-text-on-dark)",
            padding: "10px 16px",
            borderRadius: 12,
            fontSize: "0.9rem",
            boxShadow: "var(--floorplan-shadow-tooltip)",
          }}
        >
          <strong>{hoveredDesk?.label || selectedDesk?.label}</strong>
          {(() => {
            const desk = hoveredDesk || selectedDesk;
            if (!desk) return null;
            const summary = desk as DeskStatus & { reservations?: Array<{ occupant?: string; range?: string }> };
            const upcoming = summary.reservations ?? [];
            if (upcoming.length === 0) return <span> — Available</span>;

            const [first] = upcoming;
            if (first.occupant) {
              return <span> — {first.occupant}{first.range ? ` (${first.range})` : ""}</span>;
            }
            return <span> — Reserved</span>;
          })()}
        </div>
      )}
    </div>
  );
}
