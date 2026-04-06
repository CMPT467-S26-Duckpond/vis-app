import type { BathymetryPoint } from "~~/server/models/MapWaterBody";
import { clamp } from "es-toolkit";
import * as L from "leaflet";

type RGB = [r: number, g: number, b: number];

const gradient: [RGB, RGB] = [
  [0, 255, 0],
  [255, 0, 0]
];

function getColorForDepth(depth: number, maxDepth: number): string {
  const ratio = maxDepth === 0 ? 0 : clamp(depth / maxDepth, 0, 1);
  const r = Math.round(gradient[0][0] * (1 - ratio) + gradient[1][0] * ratio);
  const g = Math.round(gradient[0][1] * (1 - ratio) + gradient[1][1] * ratio);
  const b = Math.round(gradient[0][2] * (1 - ratio) + gradient[1][2] * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export function makeBathymetryPoint(
  data: BathymetryPoint,
  maxDepth: number
): L.Circle {
  return L.circle([data.latitude, data.longitude], {
    color: getColorForDepth(data.z, maxDepth),
    radius: 250,
    fillOpacity: 1
  });
}
