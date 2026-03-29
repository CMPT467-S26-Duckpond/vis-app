import * as L from "leaflet";

export async function setMapPins(map: L.Map) {
  try {
    const response = await $fetch("/api/supplementary/waterBodies");

    response.forEach((waterBody) => {
      L.marker(waterBody.position.reverse() as any).addTo(map);
    });
  } catch (error) {
    console.error("Fuck:", error);
  }
}
