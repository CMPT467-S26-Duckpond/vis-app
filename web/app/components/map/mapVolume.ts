import * as L from "leaflet";

type RGB = [r: number, g: number, b: number];

const gradient: [RGB, RGB] = [
  [255, 0, 0],
  [0, 255, 0]
];

function getColorForDepth(depth: number, maxDepth: number): string {
  const ratio = Math.min(Math.max(depth / maxDepth, 0), 1);
  const r = Math.round(gradient[0][0] * (1 - ratio) + gradient[1][0] * ratio);
  const g = Math.round(gradient[0][1] * (1 - ratio) + gradient[1][1] * ratio);
  const b = Math.round(gradient[0][2] * (1 - ratio) + gradient[1][2] * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export async function mapVolumeTest(id: string, layer: L.LayerGroup) {
  const depth = await $fetch("/api/supplementary/bathymetry", {
    method: "POST",
    body: {
      bodyId: id
    }
  });

  if (!depth) return;

  for (let i = 0; i < depth.longitude.length; i++) {
    const point = {
      longitude: depth.longitude[i]!,
      latitude: depth.latitude[i]!,
      z: depth.z[i]!
    };

    L.circle([point.latitude, point.longitude], {
      color: getColorForDepth(point.z, 300),
      radius: 2
    })
      .bindPopup(`<strong>${point.z}</strong>`)
      .addTo(layer);
  }
}
