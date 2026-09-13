import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Store, StoreComparison } from "../domain";
import "leaflet/dist/leaflet.css";
import "./MapPanel.css";
import { track } from "../services/analytics";

export interface MapPanelProps {
  stores: Store[];
  comparisons: StoreComparison[];
  origin: { lat: number; lon: number; label: string };
  selectedStoreId: string | null;
  onSelect: (id: string) => void;
  priceCounts?: Record<string, number>;
}

type MapEntry = { store: Store; comparison: StoreComparison; priceCount?: number };
type LeafletApi = typeof import("leaflet");
const euros = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

function markerLabel(comparison: StoreComparison, priceCount?: number): string {
  if (priceCount !== undefined) return `${priceCount} products`;
  if (comparison.requestedLineCount === 0) return "Empty basket";
  if (
    comparison.status === "complete" &&
    comparison.completeTotalCents != null
  ) {
    return euros.format(comparison.completeTotalCents / 100);
  }
  return `${comparison.matchedLineCount}/${comparison.requestedLineCount} items`;
}

function isComplete(comparison: StoreComparison): boolean {
  return (
    comparison.status === "complete" && comparison.completeTotalCents != null
  );
}

function accessibleLabel({ store, comparison, priceCount }: MapEntry): string {
  return `${store.name}${store.fictional ? ", fictional store" : ""}, ${markerLabel(comparison, priceCount)}, ${comparison.distanceKm.toFixed(1)} km straight-line distance. View basket details.`;
}

function escapeAttribution(text: string): string {
  const span = document.createElement("span");
  span.textContent = text;
  return span.innerHTML;
}

/** A small local equirectangular projection. No streets or routes are invented. */
function CoordinatePlot({
  entries,
  origin,
  selectedStoreId,
  onSelect,
}: {
  entries: MapEntry[];
  origin: MapPanelProps["origin"];
  selectedStoreId: string | null;
  onSelect: MapPanelProps["onSelect"];
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const height = width < 650 ? 360 : 420;
  useEffect(() => {
    const element = plotRef.current;
    if (!element) return;
    const resize = () =>
      setWidth(Math.max(300, element.getBoundingClientRect().width));
    resize();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const longitudeScale = Math.cos((origin.lat * Math.PI) / 180);
  const projected = entries.map((entry) => ({
    ...entry,
    eastKm: (entry.store.lon - origin.lon) * 111.32 * longitudeScale,
    northKm: (entry.store.lat - origin.lat) * 111.32,
  }));
  // A symmetric extent keeps the selected starting point fixed at the centre.
  const eastExtent = Math.max(
    0.5,
    ...projected.map((point) => Math.abs(point.eastKm)),
  );
  const northExtent = Math.max(
    0.5,
    ...projected.map((point) => Math.abs(point.northKm)),
  );
  const horizontalPadding = Math.min(116, width * 0.23);
  const scale = Math.min(
    (width / 2 - horizontalPadding) / eastExtent,
    (height / 2 - 86) / northExtent,
  );
  const halfKm = Math.max(eastExtent, northExtent);
  const scaleKm = halfKm >= 3 ? 1 : halfKm >= 1 ? 0.5 : 0.25;
  const occupied: Array<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }> = [];
  const offsets: number[][] = [[0, 0]];
  for (let ring = 1; ring <= 6; ring += 1) {
    for (let row = -ring; row <= ring; row += 1) {
      for (let column = -ring; column <= ring; column += 1) {
        if (Math.max(Math.abs(row), Math.abs(column)) !== ring) continue;
        offsets.push([column * 145, row * 82]);
      }
    }
  }
  const positioned = projected.map((entry) => {
    const anchorX = width / 2 + entry.eastKm * scale;
    const anchorY = height / 2 - entry.northKm * scale;
    const label = markerLabel(entry.comparison, entry.priceCount);
    const displayedName =
      width < 650 && entry.store.name.length > 17
        ? `${entry.store.name.slice(0, 16)}…`
        : entry.store.name;
    const labelWidth = Math.max(88, label.length * 7.6 + 28);
    const markerWidth = Math.max(labelWidth + 10, displayedName.length * 6.7);
    const halfWidth = markerWidth / 2;
    const candidates = offsets
      .map(([offsetX, offsetY]) => {
        const x = Math.min(
          width - halfWidth - 10,
          Math.max(halfWidth + 10, anchorX + offsetX),
        );
        const y = Math.min(height - 38, Math.max(48, anchorY + offsetY));
        return {
          x,
          y,
          box: {
            left: x - halfWidth - 6,
            right: x + halfWidth + 6,
            top: y - 46,
            bottom: y + 31,
          },
        };
      });
    const candidate = candidates.find(({ box }) =>
        occupied.every(
          (other) =>
            box.right < other.left ||
            box.left > other.right ||
            box.bottom < other.top ||
            box.top > other.bottom,
        ),
      );
    let placement = candidate;
    if (!placement) {
      let best = candidates[0];
      let bestOverlap = Number.POSITIVE_INFINITY;
      for (const current of candidates) {
        const overlap = occupied.reduce((area, other) => {
          const widthOverlap = Math.max(
            0,
            Math.min(current.box.right, other.right) -
              Math.max(current.box.left, other.left),
          );
          const heightOverlap = Math.max(
            0,
            Math.min(current.box.bottom, other.bottom) -
              Math.max(current.box.top, other.top),
          );
          return area + widthOverlap * heightOverlap;
        }, 0);
        if (overlap < bestOverlap) {
          best = current;
          bestOverlap = overlap;
        }
      }
      placement = best;
    }
    occupied.push(placement.box);
    return {
      ...entry,
      anchorX,
      anchorY,
      x: placement.x,
      y: placement.y,
      label,
      labelWidth,
      displayedName,
    };
  });

  return (
    <div ref={plotRef} className="bm-coordinate-wrap">
      <svg
        className="bm-coordinate-plot"
        style={{ height }}
        viewBox={`0 0 ${width} ${height}`}
        aria-label="Approximate positions of eligible stores relative to your starting point, north up"
      >
        <defs>
          <pattern
            id="bm-map-grid"
            width="45"
            height="42"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M45 0H0V42"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect
          width={width}
          height={height}
          fill="url(#bm-map-grid)"
          className="bm-coordinate-grid"
        />
        <path
          d={`M${width / 2} 28V${height - 28}M28 ${height / 2}H${width - 28}`}
          className="bm-coordinate-axis"
        />
        <g
          className="bm-coordinate-north"
          aria-hidden="true"
          transform={`translate(${width - 36} 34)`}
        >
          <text textAnchor="middle" y="0">
            N
          </text>
          <path d="M0 12V38M-5 18L0 12L5 18" />
        </g>
        <g
          transform={`translate(${width / 2} ${height / 2})`}
          className="bm-coordinate-origin"
        >
          <title>{`Starting point: ${origin.label}`}</title>
          <circle r="17" className="bm-origin-halo" />
          <circle r="6" className="bm-origin-centre" />
          <text y="32" textAnchor="middle">
            {origin.label}
          </text>
        </g>
        {positioned.map((entry) => {
          const selected = entry.store.id === selectedStoreId;
          const shifted =
            Math.abs(entry.x - entry.anchorX) > 1 ||
            Math.abs(entry.y - entry.anchorY) > 1;
          return (
            <g key={entry.store.id}>
              {shifted && (
                <path
                  className="bm-coordinate-connector"
                  d={`M${entry.anchorX} ${entry.anchorY}L${entry.x} ${entry.y}`}
                />
              )}
              <g
                transform={`translate(${entry.x} ${entry.y})`}
                role="button"
                tabIndex={0}
                aria-label={accessibleLabel(entry)}
                aria-pressed={selected}
                className={`bm-coordinate-point ${isComplete(entry.comparison) ? "is-complete" : "is-incomplete"}${selected ? " is-selected" : ""}`}
                onClick={() => onSelect(entry.store.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(entry.store.id);
                  }
                }}
              >
                <title>{accessibleLabel(entry)}</title>
                <rect
                  className="bm-coordinate-hit-target"
                  x={-entry.labelWidth / 2 - 5}
                  y="-41"
                  width={entry.labelWidth + 10}
                  height="75"
                  rx="14"
                />
                <circle className="bm-coordinate-pin" r="6" />
                <rect
                  className="bm-coordinate-badge"
                  x={-entry.labelWidth / 2}
                  y="-36"
                  width={entry.labelWidth}
                  height="30"
                  rx="15"
                />
                <text
                  className="bm-coordinate-price"
                  y="-16"
                  textAnchor="middle"
                >
                  {entry.label}
                </text>
                <text className="bm-coordinate-name" y="23" textAnchor="middle">
                  {entry.displayedName}
                </text>
              </g>
            </g>
          );
        })}
        <g
          className="bm-coordinate-scale"
          aria-hidden="true"
          transform={`translate(34 ${height - 30})`}
        >
          <path d={`M0 -5V0H${scaleKm * scale}V-5`} />
          <text x={(scaleKm * scale) / 2} y="17" textAnchor="middle">
            {scaleKm} km approx.
          </text>
        </g>
      </svg>
      <div className="bm-coordinate-caption">
        Relative positions · North up · No route information
      </div>
    </div>
  );
}

export default function MapPanel({
  stores,
  comparisons,
  origin,
  selectedStoreId,
  onSelect,
  priceCounts,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<LeafletApi | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, Leaflet.Marker>());
  const onSelectRef = useRef(onSelect);
  const originRef = useRef(origin);
  const lastExtentRef = useRef("");
  const [simplified, setSimplified] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  onSelectRef.current = onSelect;
  originRef.current = origin;

  const entries = useMemo(() => {
    const byId = new Map(stores.map((store) => [store.id, store]));
    return comparisons.flatMap((comparison) => {
      const store = byId.get(comparison.storeId);
      return store && comparison.withinRadius
        ? [{ store, comparison, priceCount: priceCounts?.[store.id] }]
        : [];
    });
  }, [stores, comparisons, priceCounts]);

  useEffect(() => {
    if (simplified || !containerRef.current) return;
    let cancelled = false;
    let ownedMap: Leaflet.Map | null = null;
    let observer: ResizeObserver | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;
    let removeResizeListener: (() => void) | undefined;
    setLoading(true);

    const showFallback = () => {
      if (!cancelled) {
        setLoading(false);
        setSimplified(true);
        track("map_fallback_used", { errorCategory: "basemap_unavailable" });
      }
    };

    void import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        leafletRef.current = L;
        const currentOrigin = originRef.current;
        ownedMap = L.map(containerRef.current, {
          center: [currentOrigin.lat, currentOrigin.lon],
          zoom: 14,
          scrollWheelZoom: false,
          zoomControl: true,
          attributionControl: true,
        });
        mapRef.current = ownedMap;
        ownedMap.attributionControl.setPrefix(false);
        markerLayerRef.current = L.layerGroup().addTo(ownedMap);
        lastExtentRef.current = "";
        const tileUrl =
          import.meta.env.VITE_TILE_URL ||
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
        const attribution = import.meta.env.VITE_TILE_ATTRIBUTION
          ? escapeAttribution(import.meta.env.VITE_TILE_ATTRIBUTION)
          : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
        const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19, attribution });
        let consecutiveErrors = 0;
        timeout = setTimeout(showFallback, 8500);
        tileLayer.on("tileload", () => {
          consecutiveErrors = 0;
          clearTimeout(timeout);
          if (!cancelled) setLoading(false);
        });
        tileLayer.on("tileerror", () => {
          consecutiveErrors += 1;
          if (consecutiveErrors >= 4) showFallback();
        });
        tileLayer.addTo(ownedMap);
        const resize = () => {
          if (frame !== undefined) cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            if (!cancelled) ownedMap?.invalidateSize({ pan: false });
          });
        };
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(resize);
          observer.observe(containerRef.current);
        } else {
          window.addEventListener("resize", resize);
          removeResizeListener = () =>
            window.removeEventListener("resize", resize);
        }
        resize();
        setMapVersion((version) => version + 1);
      })
      .catch(showFallback);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (frame !== undefined) cancelAnimationFrame(frame);
      observer?.disconnect();
      removeResizeListener?.();
      ownedMap?.remove();
      if (mapRef.current === ownedMap) {
        mapRef.current = null;
        markerLayerRef.current = null;
        markersRef.current.clear();
      }
    };
  }, [simplified]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const layer = markerLayerRef.current;
    if (simplified || !map || !L || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();

    const originElement = document.createElement("span");
    originElement.className = "bm-origin-marker";
    const originTooltip = document.createElement("span");
    originTooltip.textContent = `Starting point: ${origin.label}`;
    L.marker([origin.lat, origin.lon], {
      icon: L.divIcon({
        html: originElement,
        className: "bm-origin-icon",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      title: `Starting point: ${origin.label}`,
      keyboard: false,
      interactive: false,
    })
      .bindTooltip(originTooltip)
      .addTo(layer);

    for (const entry of entries) {
      const badge = document.createElement("span");
      badge.className = `bm-price-marker ${isComplete(entry.comparison) ? "is-complete" : "is-incomplete"}`;
      badge.textContent = markerLabel(entry.comparison, entry.priceCount);
      const tooltip = document.createElement("span");
      tooltip.textContent = entry.store.name;
      const marker = L.marker([entry.store.lat, entry.store.lon], {
        icon: L.divIcon({
          html: badge,
          className: "bm-store-icon",
          iconSize: [100, 38],
          iconAnchor: [50, 38],
        }),
        title: accessibleLabel(entry),
        keyboard: true,
        riseOnHover: true,
      })
        .bindTooltip(tooltip, { direction: "top", offset: [0, -32] })
        .addTo(layer);
      marker.on("click", () => onSelectRef.current(entry.store.id));
      const markerElement = marker.getElement();
      if (markerElement) {
        markerElement.setAttribute("role", "button");
        markerElement.setAttribute("aria-label", accessibleLabel(entry));
        // Leaflet handles Enter; Space also activates the marker as a button.
        markerElement.addEventListener("keydown", (event) => {
          if (event.key === " ") {
            event.preventDefault();
            onSelectRef.current(entry.store.id);
          }
        });
      }
      markersRef.current.set(entry.store.id, marker);
    }

    const extentKey = `${origin.lat},${origin.lon}|${entries
      .map((entry) => `${entry.store.id}:${entry.store.lat},${entry.store.lon}`)
      .sort()
      .join("|")}`;
    if (lastExtentRef.current !== extentKey) {
      lastExtentRef.current = extentKey;
      if (entries.length === 0) {
        map.setView([origin.lat, origin.lon], 14, { animate: false });
      } else {
        const points: Leaflet.LatLngTuple[] = [
          [origin.lat, origin.lon],
          ...entries.map(({ store }): Leaflet.LatLngTuple => [
            store.lat,
            store.lon,
          ]),
        ];
        map.fitBounds(L.latLngBounds(points), {
          padding: [62, 68],
          maxZoom: 15,
          animate: false,
        });
      }
    }
  }, [entries, origin.lat, origin.lon, origin.label, mapVersion, simplified]);

  useEffect(() => {
    for (const [storeId, marker] of markersRef.current) {
      const selected = storeId === selectedStoreId;
      const element = marker.getElement();
      element?.classList.toggle("is-selected", selected);
      element?.setAttribute("aria-pressed", String(selected));
      marker.setZIndexOffset(selected ? 1000 : 0);
    }
  }, [
    selectedStoreId,
    entries,
    origin.lat,
    origin.lon,
    origin.label,
    mapVersion,
    simplified,
  ]);

  return (
    <section className="bm-map-panel" aria-label="Store map">
      <div className="bm-map-toolbar">
        <div>
          <span className="bm-map-heading">
            {simplified
              ? "Approximate store positions · Basemap unavailable"
              : priceCounts
                ? `Explore stores in ${origin.label}`
                : "Compare your basket on the map"}
          </span>
          <span className="bm-map-subheading">
            {entries.length} covered {entries.length === 1 ? "store" : "stores"}{" "}
            within your distance · Select a store to explore
          </span>
        </div>
        <button
          type="button"
          className="bm-map-mode-button"
          onClick={() => {
            if (!simplified)
              track("map_fallback_used", { errorCategory: "manual" });
            setSimplified((value) => !value);
          }}
        >
          {simplified ? "Try street map" : "Use simplified map"}
        </button>
      </div>
      <div className="bm-map-surface">
        {simplified ? (
          <CoordinatePlot
            entries={entries}
            origin={origin}
            selectedStoreId={selectedStoreId}
            onSelect={onSelect}
          />
        ) : (
          <>
            <div
              ref={containerRef}
              className="bm-leaflet-map"
              aria-label="Interactive store map. Use Tab to select markers and Enter to open store details."
            />
            {loading && (
              <span className="bm-map-loading" role="status">
                Loading map…
              </span>
            )}
          </>
        )}
        {entries.length === 0 && (
          <div className="bm-map-empty" role="status">
            No covered stores within this distance. Increase your radius or
            change your starting point.
          </div>
        )}
      </div>
      <div className="bm-map-legend">
        <span>
          <i className="bm-legend-dot bm-legend-origin" />
          Your starting point
        </span>
        <span>
          <i className="bm-legend-dot bm-legend-complete" />
          {priceCounts ? "Recorded products" : "Complete basket"}
        </span>
        <span>
          <i className="bm-legend-dot bm-legend-incomplete" />
          {priceCounts ? "Coverage varies by store" : "Incomplete coverage"}
        </span>
        {stores.some((store) => store.fictional) && (
          <span className="bm-map-fictional">Fictional store locations</span>
        )}
      </div>
    </section>
  );
}
