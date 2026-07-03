import { Fragment, useMemo } from "react";
import { Polyline, Marker, Tooltip, LayerGroup } from "react-leaflet";
import L from "leaflet";
import { calculateDeadReckoning } from "../model/deadReckoning";
import type { VesselInfo, DeadReckoningConfig, TimeUnit } from "../model/types";

function arrowIcon(rotationDeg: number, color: string) {
  const rotation = Number.isFinite(rotationDeg) ? rotationDeg : 0;
  const size = 30;
  return new L.DivIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      transform:rotate(${rotation}deg);
      transform-origin:center center;
      display:flex;align-items:center;justify-content:center;
    ">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24">
        <polygon points="12,3 19,19 12,15 5,19"
          fill="transparent" stroke="${color}" stroke-width="2"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function tickIcon(rotationDeg: number, tickInfo: string, color: string) {
  const normRotation = ((rotationDeg % 360) + 360) % 360;
  const textRotation = normRotation > 90 && normRotation < 270 ? 180 : 0;
  const [timePart, distancePart] = tickInfo.split(" (");

  return new L.DivIcon({
    className: "",
    html: `<div style="
      height:24px;background:${color};
      transform:rotate(${rotationDeg}deg);
      transform-origin:bottom center;
      display:flex;align-items:flex-end;
    ">
      <p style="
        padding-left:8px;padding-bottom:16px;
        transform:rotate(${textRotation}deg);
        margin:0;white-space:nowrap;
        font-size:18px;color:white;text-align:center;
      ">${timePart}<br/>(${distancePart}</p>
    </div>`,
    iconSize: [2, 24],
    iconAnchor: [1, 24],
  });
}

interface DeadReckoningLayerProps {
  vessel: VesselInfo;
  config: DeadReckoningConfig;
}

function toMinutes(value: number, unit: TimeUnit): number {
  switch (unit) {
    case "hours": return value * 60;
    case "days": return value * 60 * 24;
    default: return value;
  }
}

function DeadReckoningLayer({ vessel, config }: DeadReckoningLayerProps) {
  const timePoints = useMemo(
    () => config.intervals.map((iv) => toMinutes(iv.value, iv.unit)),
    [config.intervals]
  );

  const { drPoints, extension } = useMemo(
    () => calculateDeadReckoning(vessel, timePoints),
    [vessel, timePoints]
  );

  if (!vessel || drPoints.length === 0 || !extension) return null;

  const heading = vessel.headingCurrentConsensusValue;
  const speed = vessel.speedCurrentConsensusValue;
  const startLat = vessel.locationCurrentLat;
  const startLon = vessel.locationCurrentLon;

  return (
    <LayerGroup>
      {drPoints.map((p, idx) => {
        const prev =
          idx === 0 ? [startLat, startLon] : [drPoints[idx - 1].lat, drPoints[idx - 1].lon];
        const curr: [number, number] = [p.lat, p.lon];
        const distanceNm = (speed * p.time) / 60;
        const iv = config.intervals[idx];
        const label = iv ? `${iv.value} ${iv.unit}` : `${p.time} min`;

        return (
          <Fragment key={idx}>
            <Polyline positions={[prev as [number, number], curr]} color={config.lineColor} weight={config.lineWeight} />
            <Marker
              position={curr}
              icon={tickIcon(heading - 90, `${label} (${distanceNm.toFixed(2)} NM)`, config.pointColor)}
            />
          </Fragment>
        );
      })}

      {/* Extension line */}
      <Polyline
        positions={[
          [drPoints[drPoints.length - 1].lat, drPoints[drPoints.length - 1].lon],
          [extension.lat, extension.lon],
        ]}
        color={config.lineColor}
        weight={config.lineWeight}
      />

      {/* Arrow marker */}
      <Marker position={[extension.lat, extension.lon]} icon={arrowIcon(heading, config.pointColor)}>
        <Tooltip permanent direction="right" offset={[14, 0]}>
          <span style={{ fontSize: "18px" }}>
            {`${speed.toFixed(1)} kn | ${heading.toFixed(0)}°`}
          </span>
        </Tooltip>
      </Marker>
    </LayerGroup>
  );
}

export default DeadReckoningLayer;
