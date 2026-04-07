import type { IWaterBody } from "~~/server/models/MapWaterBody";
import * as L from "leaflet";

export const useWaterBodyPins = (
  clickHandler: (
    a: L.LeafletMouseEvent,
    feature: IWaterBody,
    id: string
  ) => void
) => {
  let waterBodyLayer = new L.LayerGroup();

  $fetch("/api/supplementary/waterBodies").then((data) => {
    data.forEach((body) => {
      L.marker(body.position.reverse() as any, {})
        .bindPopup(
          [
            `<strong>${body.name}</strong>`,
            `Surface Area: ${body.surfaceAreaKM2.toLocaleString()} km²`,
            `Volume: ${body.volumeKM3.toLocaleString()} km³`
          ].join("<br>")
        )
        .addEventListener("click", (a) => {
          a.target.openPopup();
          clickHandler(a, body, body._id);
        })
        .addTo(waterBodyLayer);
    });
  });

  return {
    waterBodyLayer
  };
};
