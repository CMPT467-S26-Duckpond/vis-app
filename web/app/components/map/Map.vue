<template>
  <!-- 
    This template section is very tiny. That's because all we need to do is define a "dummy" element that leaflet can use to populate with a map 

    All we need to do is give Vue a way to target the element (ref attribute) and give it some styling
  -->
  <div ref="map" style="height: 500px" />
</template>

<script setup lang="ts">
import * as L from "leaflet";
import { ref, onMounted, useTemplateRef } from "vue";

import { setMapPins } from "./mapPins";

const initialMap = ref<L.Map>();
const map = useTemplateRef("map");

function loadMap() {
  if (!initialMap.value) return;

  initialMap.value.setView([40.7128, -74.006], 2);

  L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  }).addTo(initialMap.value!);
}

onMounted(() => {
  // Quick way to make sure we do in fact have our map div available
  // Yes, if map doesn't exist everything about this component would break. Whatever. This shouldn't ever be triggered. It's mostly to make Typescripts type-checker happy.
  if (!map.value) return;

  // Most of this code is adapted from this: https://medium.com/@smhabibjr/implement-an-interactive-map-in-the-vue-js-8a865010fb41
  // Leaflet let's you pick a specific set of "map tiles" to use as the background. I played around here: https://leaflet-extras.github.io/leaflet-providers/preview/
  initialMap.value = L.map(map.value);

  const pinLayer = new L.LayerGroup().addTo(initialMap.value);
  const shapeLayer = new L.LayerGroup().addTo(initialMap.value);

  loadMap();

  setMapPins(pinLayer, initialMap.value, async (event, id) => {
    shapeLayer.clearLayers();
    const bodyData = await $fetch(`/api/supplementary/waterBodies/${id}`);

    L.geoJSON(bodyData.geoJSON, {
      style: {
        color: "blue",
        fillColor: "blue",
        fillOpacity: 0.5
      }
    }).addTo(shapeLayer);
  });
});
</script>
