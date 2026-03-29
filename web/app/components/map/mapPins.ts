import * as L from "leaflet";

export async function setMapPins(map: L.Map) {
  try {
    const response = await $fetch("/api/supplementary/waterBodies");

    response.forEach((waterBody) => {
      L.marker(waterBody.position.reverse() as any, {})
        .bindPopup(`<strong>${waterBody.name}</strong>`)
        .addTo(map);
    });
  } catch (error) {
    console.error("Fuck:", error);
  }
}
