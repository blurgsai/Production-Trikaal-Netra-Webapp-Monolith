import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

function roundDisplayValue(value: number) {
  if (value >= 1000) return Math.round(value / 100) * 100;
  if (value >= 100) return Math.round(value / 10) * 10;
  if (value >= 10) return Math.round(value);
  return Number(value.toFixed(1));
}

interface ScaleBarProps {
  unit?: "km" | "nm" | "mi";
}

function ScaleBar({ unit = "km" }: ScaleBarProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const control = (L.control as unknown as (opts: L.ControlOptions) => L.Control)({ position: "bottomleft" });

    control.onAdd = () => {
      const container = L.DomUtil.create("div", "leaflet-control");
      container.style.background = "rgba(255,255,255,0.95)";
      container.style.padding = "4px 8px";
      container.style.border = "1px solid rgba(0,0,0,0.2)";
      container.style.borderRadius = "4px";
      container.style.boxShadow = "0 1px 4px rgba(0,0,0,0.2)";
      container.style.fontSize = "12px";
      container.style.fontWeight = "500";
      container.style.color = "#222";
      container.style.minWidth = "90px";
      container.style.pointerEvents = "none";

      const bar = L.DomUtil.create("div", "", container);
      bar.style.height = "6px";
      bar.style.border = "2px solid #333";
      bar.style.borderTop = "none";
      bar.style.marginBottom = "4px";

      const label = L.DomUtil.create("div", "", container);
      label.style.textAlign = "center";

      const updateScale = () => {
        const y = map.getSize().y / 2;
        const maxWidthPx = 100;

        const leftLatLng = map.containerPointToLatLng([0, y]);
        const rightLatLng = map.containerPointToLatLng([maxWidthPx, y]);

        const distanceMeters = map.distance(leftLatLng, rightLatLng);

        let distanceValue: number;
        let unitLabel: string;

        if (unit === "nm") {
          distanceValue = distanceMeters / 1852;
          unitLabel = "NM";
        } else if (unit === "mi") {
          distanceValue = distanceMeters / 1609.344;
          unitLabel = "MI";
        } else {
          distanceValue = distanceMeters / 1000;
          unitLabel = "KM";
        }

        const roundedValue = roundDisplayValue(distanceValue);
        label.innerHTML = `${roundedValue} ${unitLabel}`;
      };

      updateScale();
      map.on("zoomend moveend", updateScale);

      (control as unknown as { _removeListeners: () => void })._removeListeners = () => {
        map.off("zoomend moveend", updateScale);
      };

      return container;
    };

    control.addTo(map);

    return () => {
      const ctrl = control as unknown as { _removeListeners?: () => void };
      if (ctrl._removeListeners) {
        ctrl._removeListeners();
      }
      control.remove();
    };
  }, [map, unit]);

  return null;
}

export default ScaleBar;
