import type { BathymetryResponse } from "~~/server/api/supplementary/waterBodies/[id]/bathymetry.get";

import * as L from "leaflet";

type RGB = [r: number, g: number, b: number];

const gradient: [RGB, RGB] = [
  [0, 255, 0],
  [255, 0, 0]
];

function getColorForDepth(depth: number, maxDepth: number): string {
  const ratio = Math.min(Math.max(depth / maxDepth, 0), 1);
  const r = Math.round(gradient[0][0] * (1 - ratio) + gradient[1][0] * ratio);
  const g = Math.round(gradient[0][1] * (1 - ratio) + gradient[1][1] * ratio);
  const b = Math.round(gradient[0][2] * (1 - ratio) + gradient[1][2] * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export function renderBathymetryData(
  data: BathymetryResponse,
  layer: L.LayerGroup,
  pinMinDepth?: number
) {
  const minDepth = pinMinDepth ?? Math.min(...data.z);

  for (let i = 0; i < data.longitude.length; i++) {
    const point = {
      longitude: data.longitude[i]!,
      latitude: data.latitude[i]!,
      z: data.z[i]!
    };

    L.circle([point.latitude, point.longitude], {
      color: getColorForDepth(point.z, minDepth),
      radius: 2
    }).addTo(layer);
  }
}
