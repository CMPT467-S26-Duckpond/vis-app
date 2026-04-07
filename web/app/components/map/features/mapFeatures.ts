import type { GeoJsonObject } from "geojson";
import * as L from "leaflet";

export async function setMapPins(
  layer: L.LayerGroup,
  map: L.Map,
  clickHandler: (event: L.LeafletMouseEvent, waterBodyId: string) => unknown
) {
  try {
    const response = await $fetch("/api/supplementary/waterBodies");

    response.forEach((waterBody) => {
      L.marker(waterBody.position.reverse() as any, {})
        .bindPopup(
          [
            `<strong>${waterBody.name}</strong>`,
            `Surface Area: ${waterBody.surfaceAreaKM2.toLocaleString()} km²`,
            `Volume: ${waterBody.volumeKM3.toLocaleString()} km³`
          ].join("<br>")
        )
        .addEventListener("click", (a) => {
          a.target.openPopup();
          map.setView(a.latlng, 8);
          clickHandler(a, waterBody._id);
        })
        .addTo(layer);
    });
  } catch (error) {
    console.error(error);
  }
}
